# VolunteerHours

This project is an Apps Script application managed locally with `clasp` and version controlled with Git.

## Synchronization Workflow

To keep your code synchronized across Google Apps Script, your local machine, and this GitHub repository, follow these workflows.

### Workflow 1: Pushing Local Changes to GitHub

Use this when you have made changes locally that you want to save to GitHub.

```bash
# Stage all your changes
git add .

# Commit your changes with a descriptive message
git commit -m "Your descriptive message about the changes"

# Push your commit to GitHub
git push
```

### Workflow 2: Pushing Local Changes to Apps Script

Use this to upload your local code to the Google Apps Script online editor.

```bash
# Tell Gemini to push the changes for you, or run:
clasp push
```

### Workflow 3: Pulling Remote Apps Script Changes to Local

Use this if you or someone else made changes in the online editor and you need to bring them to your local machine before committing to GitHub.

```bash
# Tell Gemini to pull the changes for you, or run:
clasp pull

# After pulling, commit the updated files to GitHub
git add .
git commit -m "Sync changes from Apps Script editor"
git push
```
