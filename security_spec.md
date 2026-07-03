# Security Specification for SocialFlow

## 1. Data Invariants
- A Post must have a valid `platform` ('instagram' | 'tiktok').
- A Post must have a valid `phase`.
- `updatedAt` must always be `request.time`.
- `date` must be a valid Timestamp.

## 2. The Dirty Dozen Payloads
1. **Identity Theft:** Anonymous user trying to create a post.
2. **Phase Escalation:** Client trying to move a post from `idea_1` to `approved` skipping intermediate steps.
3. **Ghost Field:** User trying to inject `isVerified: true` into a post document.
4. **Timestamp Spoofing:** Client sending a manual `updatedAt` string.
5. **Role Hijacking:** User trying to update their own `role` to `admin`.
6. **Cross-Post Leak:** Client trying to read a post in `idea_1` phase (internal only).
7. **Comment Forgery:** User posting a comment as another user.
8. **Orphaned Writes:** Creating a comment for a non-existent post.
9. **Platform Poisoning:** Setting platform to 'facebook' (not supported).
10. **Admin Bypass:** Non-admin trying to delete a post.
11. **Size Attack:** Sending a 2MB string in the `idea` field.
12. **Malicious ID:** Using a 1KB string as `postId`.

## 3. Test Runner (Mock Logic)
- `PERMISSION_DENIED` for all above cases.
