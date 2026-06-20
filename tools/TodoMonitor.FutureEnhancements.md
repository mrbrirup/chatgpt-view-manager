# Todo Monitor - Possible Future Enhancements

The current goal is deliberately simple:

```text
JavaScript Todo
    ↓
Markdown Todo file
    ↓
GitHub Issue
```

This replaces paper notes with one central place to track work, without turning the tool into a larger project too early.

## Current Useful Behaviour

The current version is enough for now because it can:

- Find Todos in JavaScript files.
- Normalise them into the full Todo comment format.
- Add missing metadata automatically.
- Add the Todo to a central markdown file.
- Create a GitHub issue using the GitHub CLI.
- Store the GitHub issue URL back in the JavaScript file.

That gives a simple workflow:

1. Write a quick Todo while coding.
2. Save the file.
3. Let the monitor update the source comment.
4. Let the monitor add it to the markdown file.
5. Let the monitor create the GitHub issue.

## Later Enhancements

These are only ideas to review once the basic workflow has been used for a while.

### 1. Update Existing GitHub Issues

If a Todo already has a `GitUrl`, the tool could update the existing GitHub issue instead of creating a new one.

Possible sync rules:

- `Status: Closed` closes the GitHub issue.
- `Status: Open` reopens the GitHub issue.
- Changing `Label` updates the GitHub labels.
- Changing `Todo` updates the GitHub issue title.
- Changing `Description` updates the GitHub issue body.

This should wait until the basic GitHub workflow feels useful.

### 2. Improve Markdown Links

The markdown file could include the issue number or a clickable GitHub link.

Current style:

```markdown
- [ ] Todo: Fix login {guid} (2026-06-20 12:34:56)
```

Possible future style:

```markdown
- [ ] [#123](https://github.com/user/repo/issues/123) Fix login {guid}
```

This would make the markdown file easier to use as a central index.

### 3. Auto-Create GitHub Labels

If a label does not exist in GitHub, the tool could create it automatically.

Example:

```javascript
/**
 * Todo: Fix login
 * Label: bug
 */
```

If `bug` does not exist, the tool could run:

```powershell
gh label create bug
```

This may be useful later, but it could also create messy labels if there are typos.

### 4. Group-to-Label Mapping

Groups could be mapped to GitHub labels.

Example:

```text
Authentication -> area:authentication
UI             -> area:ui
Storage        -> area:storage
```

This would allow simple JavaScript comments while still producing structured GitHub issues.

### 5. Assignees

A future field could assign issues automatically.

Example:

```javascript
/**
 * Todo: Fix login
 * Assignee: mrbr41
 */
```

This could call:

```powershell
gh issue create --assignee mrbr41
```

Probably not needed while working mostly alone.

### 6. Milestones

A future field could attach issues to GitHub milestones.

Example:

```javascript
/**
 * Todo: Fix login
 * Milestone: 2.3
 */
```

Useful once project milestones are being managed in GitHub.

### 7. Multi-Line Descriptions

Descriptions could support longer notes.

Example:

```javascript
/**
 * Todo: Fix login
 * Description:
 *   Login works on desktop.
 *   It crashes on mobile Safari.
 *   The error occurs after MFA.
 */
```

This would make GitHub issue bodies more useful.

### 8. Git Remote Detection

The current tool only checks that the folder is inside a Git repository.

Later it could inspect remotes:

```powershell
git remote -v
```

Then it could detect the GitHub remote automatically if there are several remotes.

### 9. Removed Todo Behaviour

If a Todo is removed from the JavaScript file, the tool could detect that.

Possible behaviours:

- Do nothing.
- Mark the markdown Todo as removed.
- Close the GitHub issue.

The safest default is probably: **do nothing**.

Accidentally deleting a comment should not automatically close a GitHub issue.

### 10. Bidirectional Sync

The most ambitious version would sync between:

```text
JavaScript comment ⇄ Markdown file ⇄ GitHub Issue
```

This would allow GitHub edits to be pulled back into the source comments.

This is probably too much for the first version because it creates many edge cases:

- Which source wins if both are edited?
- What happens if the issue title changes?
- What happens if the JavaScript Todo is deleted?
- What happens if a GitHub issue is closed manually?
- What happens if labels are changed in GitHub?

This should only be considered if the simple one-way workflow proves useful first.

## Preferred Direction

For now, keep the tool simple.

The likely best next step is not to add more automation immediately, but to use the current version and see which parts of the workflow are actually useful.

Good candidates for later improvements:

1. Better markdown GitHub links.
2. Multi-line descriptions.
3. Updating existing GitHub issues from existing `GitUrl` values.

Avoid bidirectional sync until there is a clear need for it.
