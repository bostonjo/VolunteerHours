# VolunteerHours

This project is an Apps Script application managed locally with `clasp` and version controlled with Git, with the help of the Gemini CLI.

## Synchronization Workflow

To keep your code synchronized across Google Apps Script, your local machine, and this GitHub repository, tell Gemini what you want to do.

### Workflow 1: Save Local Changes to GitHub

Use this when you have made changes locally in Cursor that you want to save to your GitHub repository.

1.  Save your file changes in the editor.
2.  Tell Gemini: **"Commit my changes to GitHub with the message 'Your descriptive message'."**

### Workflow 2: Push Local Changes to Apps Script

Use this to upload your local code to the Google Apps Script online editor to test or deploy it.

- Tell Gemini: **"Push my changes to Apps Script."**

### Workflow 3: Sync Changes from Apps Script to GitHub

Use this if you or someone else made changes in the online editor and you need to save them to the GitHub repository.

- Tell Gemini: **"Pull the latest changes from Apps Script and commit them to GitHub."**
