# Gemini_flash
Gemini chatbot
# AI Chatbot with Gemini and Firebase

This is a sleek, touch-friendly AI chatbot built with a pure HTML/CSS/JS frontend. It uses Firebase for user authentication and Vercel Serverless Functions to securely connect to the Google Gemini API.

## How to Deploy

Follow these steps to get your own version of this chatbot running.

### 1. Set up GitHub

1.  **Create Files:** Create all the files listed above (`index.html`, `api/chat.js`, `package.json`, `vercel.json`) in a local folder.
2.  **Create Repository:** Go to [GitHub](https://github.com/new) and create a new repository.
3.  **Push Your Code:** Upload the files you created to this new repository.

### 2. Configure Firebase

Your `index.html` is already configured with your Firebase project keys. You just need to enable the authentication method.

1.  Go to the [Firebase Console](https://console.firebase.google.com/) and select your project (`ai-chatbot-b38da`).
2.  In the left menu, go to **Build > Authentication**.
3.  Click the **"Get started"** button if you haven't already.
4.  Go to the **"Sign-in method"** tab.
5.  Click on **"Google"** from the list of providers.
6.  **Enable** the toggle switch.
7.  Enter a project support email.
8.  Click **Save**.

That's it! Your app is now ready to accept Google logins.

### 3. Deploy and Configure Vercel

1.  **Import Project:** Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New... > Project"**.
2.  **Import Git Repository:** Find your new GitHub repository in the list and click **"Import"**.
3.  **Configure Project:** Vercel will automatically detect that you are using a frontend with no specific framework. This is correct.
4.  **Set Environment Variable:**
    *   Expand the **"Environment Variables"** section.
    *   Add a new variable with the name `GEMINI_API_KEY`.
    *   Paste your Google Gemini Flash API key as the value.
    *   Ensure the variable is available to all environments.
5.  **Deploy:** Click the **"Deploy"** button.

Vercel will now build and deploy your project. Once it's finished, you can visit your Vercel domain (`gemini-flash-qilb.vercel.app` or a new one it assigns) and your fully working chatbot will be live.
