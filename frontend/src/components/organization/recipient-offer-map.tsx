"use client";

import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/components/account/location-autocomplete";
import type { DiscoveredOffer, PickupBase } from "@/lib/canonical-recipient";

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

type MapInstance = {
	fitBounds: (bounds: BoundsInstance, padding?: number) => void;
	addListener: (eventName: string, callback: () => void) => { remove: () => void };
};
type BoundsInstance = { extend: (position: { lat: number; lng: number }) => void };
type InfoWindowInstance = { open: (options: { map: MapInstance; anchor: MarkerInstance }) => void };
type MarkerInstance = { addListener: (eventName: string, callback: () => void) => { remove: () => void } };
type MapsLibrary = {
	Map: new (element: HTMLElement, options: Record<string, unknown>) => MapInstance;
	InfoWindow: new (options: { content: string }) => InfoWindowInstance;
};
type CoreLibrary = { LatLngBounds: new () => BoundsInstance };
type MarkerLibrary = {
	AdvancedMarkerElement: new (options: { map: MapInstance; position: { lat: number; lng: number }; title: string }) => MarkerInstance;
};

export function RecipientOfferMap({ offers, pickupBase, onUnavailable }: { offers: DiscoveredOffer[]; pickupBase: PickupBase; onUnavailable: () => void }) {
	const mapElement = useRef<HTMLDivElement>(null);
	const [state, setState] = useState<"loading" | "ready" | "unavailable">(MAPS_API_KEY ? "loading" : "unavailable");
	const [failure, setFailure] = useState("");

	useEffect(() => {
		let active = true;
		const listeners: Array<{ remove: () => void }> = [];
		void (MAPS_API_KEY ? loadGoogleMaps(MAPS_API_KEY) : Promise.reject(new Error("Google Maps is not configured."))).then(async (maps) => {
			if (!maps || !mapElement.current) throw new Error("Google Maps did not become available.");
			const [mapsValue, markersValue, coreValue] = await Promise.all([
				maps.importLibrary("maps"),
				maps.importLibrary("marker"),
				maps.importLibrary("core"),
			]);
			if (!active || !mapElement.current) return;
			const mapLibrary = mapsValue as MapsLibrary;
			const markerLibrary = markersValue as MarkerLibrary;
			const coreLibrary = coreValue as CoreLibrary;
			const map = new mapLibrary.Map(mapElement.current, {
				center: { lat: pickupBase.latitude, lng: pickupBase.longitude },
				zoom: 11,
				mapId: "DEMO_MAP_ID",
				mapTypeControl: false,
				streetViewControl: false,
				fullscreenControl: true,
			});
			const bounds = new coreLibrary.LatLngBounds();
			bounds.extend({ lat: pickupBase.latitude, lng: pickupBase.longitude });
			for (const offer of offers) {
				const position = { lat: offer.approximate_latitude, lng: offer.approximate_longitude };
				bounds.extend(position);
				const marker = new markerLibrary.AdvancedMarkerElement({ map, position, title: `${offer.title}, about ${offer.approximate_distance_km.toFixed(1)} km away` });
				const safeTitle = offer.title.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char] ?? char);
				const popup = new mapLibrary.InfoWindow({ content: `<strong>${safeTitle}</strong><br>${offer.approximate_distance_km.toFixed(1)} km · approximate area` });
				listeners.push(marker.addListener("click", () => popup.open({ map, anchor: marker })));
			}
			map.fitBounds(bounds, 48);
			listeners.push(map.addListener("idle", () => { if (active) setState("ready"); }));
			window.setTimeout(() => { if (active) setState("ready"); }, 2500);
		}).catch((cause: unknown) => {
			if (!active) return;
			setFailure(cause instanceof Error ? cause.message : "The map could not be loaded.");
			setState("unavailable");
			onUnavailable();
		});
		return () => { active = false; listeners.forEach((listener) => listener.remove()); };
	}, [offers, pickupBase, onUnavailable]);

	return <div className="space-y-2">
		{state === "loading" && <p role="status" className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">Loading nearby map…</p>}
		{state === "unavailable" && <p role="status" className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">Map view is unavailable{failure ? ` (${failure})` : ""}. Switch to List to browse the offers.</p>}
		<div ref={mapElement} aria-label="Map showing approximate pickup areas for available offers" className={`h-[320px] w-full overflow-hidden rounded-2xl border border-line bg-surface-muted sm:h-[420px] ${state === "unavailable" ? "hidden" : ""}`} />
		<p className="text-xs leading-5 text-muted">Map markers use approximate offer locations only. Exact pickup details appear after you reserve an offer.</p>
	</div>;
}
