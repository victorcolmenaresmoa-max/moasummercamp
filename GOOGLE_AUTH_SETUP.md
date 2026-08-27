# Google login setup — MOA Reading Lab

The code in this package already uses Google OAuth through Supabase for both sign-in and participant registration.

## 1. Google Cloud

1. Open Google Cloud Console and select/create the project you want to use for MOA Reading Lab.
2. Open **Google Auth Platform**.
3. Configure **Branding** (app name, support email, logo if desired).
4. Configure **Audience**. If participants can use normal Gmail accounts outside your organization, choose **External**. While testing, add your own emails as test users; publish the app when ready for all participants.
5. In **Data Access**, make sure the basic scopes needed by Supabase are available: `openid`, email and profile.
6. Open **Clients** → **Create client** → choose **Web application**.
7. Under **Authorized JavaScript origins**, add your production web origin, for example `https://your-project.vercel.app`. Add `http://localhost:3000` only if you test locally.
8. Under **Authorized redirect URIs**, paste the callback URL shown by Supabase on **Authentication → Providers → Google**. It normally looks like `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
9. Create the client and copy the **Client ID** and **Client Secret**.

## 2. Supabase

1. Open the correct Supabase project.
2. Go to **Authentication → Providers → Google**.
3. Enable Google.
4. Paste the Google **Client ID** and **Client Secret**, then save.
5. Go to **Authentication → URL Configuration**.
6. Set **Site URL** to the official production URL of this app, e.g. `https://your-project.vercel.app` or your custom domain.
7. Add this exact production redirect URL: `https://your-project.vercel.app/auth/callback`.
8. If you test locally, also add `http://localhost:3000/auth/callback`.

Important: Google Cloud receives the **Supabase** callback URL (`...supabase.co/auth/v1/callback`). Supabase's Redirect URLs receive the **app** callback URL (`...vercel.app/auth/callback`). Do not swap them.

## 3. Vercel

No Google Client ID or Client Secret needs to be placed in Vercel for this implementation; Supabase stores those credentials.

Keep the existing Supabase variables. For the camp code, the current `NEXT_PUBLIC_CAMP_CODE` still works. For better privacy you can additionally create a server-only variable named `CAMP_CODE` with the same value, then redeploy. The code prefers `CAMP_CODE` when present.

## 4. Test order

1. Deploy this package to Vercel.
2. Open the production `/signup` page in an incognito/private window.
3. Choose campus and route, enter the camp code, and click **Continue with Google**.
4. Choose a Google account. You should return directly to `/lab`.
5. Sign out and test `/login`; **Continue with Google** should return to the existing workbook.
6. Test one existing password-based account that uses the same verified Google email. Supabase normally links the Google identity automatically to that existing user, preserving the same profile/workbook.
7. Test the moderator/admin Google account and confirm it returns to `/moderator`.

Do not disable the Email provider in Supabase until all important existing accounts have successfully tested Google sign-in at least once.
