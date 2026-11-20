# Jhonty Hub Firestore Security Specification

## 1. Data Invariants
1. **Master Admin Authority**: Only the bootstrapped owner (`shettyharikrishna1@gmail.com` with `email_verified == true`) or UIDs present in `/admins/{uid}` with `email_verified == true` hold administrative privileges (`isAdmin()`).
2. **No Self-Assigned Roles**: On `/users/{userId}` creation by a non-admin, `role` MUST equal `'customer'`, `status` MUST equal `'active'`, `ordersCount == 0`, `totalSpentUsd == 0`, and `uid == request.auth.uid`. Non-admin updates on `/users/{userId}` are restricted strictly to `['name', 'photoURL', 'updatedAt']`.
3. **PII Isolation**: `/users/{userId}` and `/orders/{orderId}` contain PII (`email`, `shippingAddress`, `shippingName`). Blanket reads are forbidden; `get` is restricted to owner or admin, and `list` requires either admin authority or explicit `resource.data.userId == request.auth.uid`.
4. **Catalog Integrity**: `/products/{productId}` is publicly readable for the storefront, but all mutations require `isAdmin()`, valid document ID (`^[a-zA-Z0-9_-]+$`), valid pricing/stock bounds, and server timestamps (`request.time`).
5. **Immutable Audit Ledger**: `/inventoryLogs/{logId}` can only be created by `isAdmin()` when the referenced `/products/{productId}` exists (`exists(...)`), with `actorUid == request.auth.uid` and `createdAt == request.time`. Updates and deletes are permanently denied.
6. **Terminal Order Locking**: Once an order reaches `delivered`, `cancelled`, or `refunded`, non-admins cannot modify it. Non-admin customers may only cancel their own `pending` orders (`affectedKeys().hasOnly(['status', 'updatedAt'])`).
7. **Temporal & Schema Integrity**: Every document enforces strict `hasAll` + `hasOnly` key checks, `.size()` limits on every string and array, immutable `createdAt` / `uid` / `userId`, and `request.time` timestamp validation.

## 2. The "Dirty Dozen" Adversarial Payloads (All Must Return `PERMISSION_DENIED`)
1. **Self-Role Escalation on Registration**: Customer creates `/users/{myUid}` with `role: "admin"`.
2. **Profile Role Escalation on Update**: Customer updates `/users/{myUid}` changing `role` from `"customer"` to `"admin"`.
3. **Shadow Ghost Field Injection**: Admin or customer writes `/products/ringer-tee` with an extra unlisted key `isVerified: true`.
4. **Unverified Admin Email Spoofing**: User with token email `shettyharikrishna1@gmail.com` and `email_verified: false` tries to write `/products/ringer-tee`.
5. **Cross-User PII Snooping**: Customer A tries `get` on `/users/{customerB}` or `/orders/{orderOfB}`.
6. **Blanket User List Scraping**: Customer A runs `list` on `/users`.
7. **Unscoped Order List Scraping**: Customer A runs `list` on `/orders` without `where('userId', '==', customerA.uid)`.
8. **ID Poisoning Attack**: Attacker tries to create `/products/../../evil$id` or a 200-char document ID.
9. **Order Owner Spoofing**: Customer A creates `/orders/ord1` with `userId: customerB.uid`.
10. **Terminal State Tampering**: Customer A tries to update a `delivered` order back to `pending` or `cancelled`.
11. **Orphaned Inventory Log**: Admin attempts to create `/inventoryLogs/log1` referencing a non-existent `productId: "ghost-item"`.
12. **Audit Log Tampering / Value Poisoning**: Admin attempts to `update` or `delete` an existing `/inventoryLogs/log1`, or writes a 10KB string into `note`.
