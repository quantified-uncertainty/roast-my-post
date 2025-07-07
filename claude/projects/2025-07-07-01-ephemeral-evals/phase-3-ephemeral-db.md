#### 3.3 Database Schema

##### Enhanced AgentEvalBatch Schema

```prisma

// Update Agent model to support ephemeral agents
model Agent {
  id                      String              @id @default(cuid())
  name                    String
  type                    AgentType
  primaryInstructions     String
  selfCritiqueInstructions String?
  providesGrades          Boolean            @default(false)
  isActive                Boolean            @default(true)

  // NEW: Link to ephemeral batch if created for one
  ephemeralBatchId        String?            @unique
  ephemeralBatch          AgentEvalBatch?    @relation("EphemeralAgent", fields: [ephemeralBatchId], references: [id], onDelete: Cascade)

  createdAt               DateTime           @default(now())
  updatedAt               DateTime           @updatedAt

  evaluations             Evaluation[]
  agentVersions           AgentVersion[]
  agentEvalBatches        AgentEvalBatch[]

  @@index([type])
  @@index([isActive])
}

// Enhanced AgentEvalBatch to support both regular batches and experiments
model AgentEvalBatch {
  id                   String              @id @default(cuid())
  name                 String?
  agentId              String
  targetCount          Int?                // Optional - might not know upfront
  createdAt            DateTime            @default(now())
  requestedDocumentIds String[]            @default([]) // Can be empty
  userId               String

  // NEW: Experiment features (all optional)
  trackingId           String?             // User-friendly ID for experiments
  description          String?
  expiresAt            DateTime?           // When to auto-delete
  isEphemeral          Boolean             @default(false)

  agent                Agent               @relation(fields: [agentId], references: [id])
  user                 User                @relation(fields: [userId], references: [id])
  jobs                 Job[]

  // Relations for ephemeral resources
  ephemeralAgent       Agent?              @relation("EphemeralAgent")
  ephemeralDocuments   Document[]          @relation("EphemeralDocuments")

  @@index([agentId])
  @@index([userId])
  @@index([expiresAt])
  @@unique([userId, trackingId]) // Only enforced when trackingId exists
}

// Optional: Track ephemeral documents separately
model Document {
  id                   String              @id @default(cuid())
  // ... existing fields ...

  // NEW: Link to ephemeral batch if created for one
  ephemeralBatchId     String?
  ephemeralBatch       AgentEvalBatch?    @relation("EphemeralDocuments", fields: [ephemeralBatchId], references: [id], onDelete: Cascade)

  // ... rest of model ...

  @@index([ephemeralBatchId])
}
```
