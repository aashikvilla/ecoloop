# Firebase App Hosting Configuration Guide

## Overview
Firebase App Hosting is built specifically for full-stack Next.js applications (App Router, Server Actions, SSR, ISR). It natively integrates with Cloud Build and GitHub.

## Setup Steps

1. **Enable Required APIs**:
   ```bash
   gcloud services enable apphosting.googleapis.com
   ```

2. **Connect GitHub Repository**:
   - In the Firebase Console, navigate to **Build > App Hosting**.
   - Connect the repository `aashikvilla/ecoloop`.
   - Specify the root directory: `/frontend`.
   - Choose live branch: `main`.

3. **`apphosting.yaml` Parameters**:
   - `runConfig.cpu` & `memoryMiB`: Compute resources for Next.js SSR server.
   - `env`: Configuration variables passed into the Cloud Run service managed by App Hosting.

4. **Custom Domain & HTTPS**:
   - Automatic TLS certificate provisioning on `.web.app` and custom domains.
