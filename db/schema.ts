import {
  boolean,
  timestamp,
  pgTable,
  text,
  integer,
  pgEnum,
  index,
  unique,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm/relations";

export const planEnum = pgEnum('plan', ["FREE", 'BASIC', 'PRO', 'BUSINESS', 'ENTERPRISE', 'OS']);


export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  apiCalls: integer("api_calls").default(0).notNull(),
  plan: planEnum("plan").default("FREE").notNull(),
  customerId: text("customer_id")
})

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);


export const files = pgTable("file", {
  name: text("name").notNull(),
  id: text("id").notNull(), // file_hashed:user_id
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  totalPages: integer("total_pages").default(0).notNull(),
  chunksCount: integer("chunks_count").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
}, (t) => [unique().on(t.id, t.userId)])

export const apiKeys = pgTable("apiKey", {
  name: text("name").primaryKey(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  apiKey: text("api_key").unique().notNull(),
  generatedTime: timestamp("generated_time").notNull(),
});


// ----- Relations ----
export const filesRelations = relations(files, ({ one }) => ({
  file: one(users, {
    fields: [files.userId],
    references: [users.id]
  }),
}))

export const userRelations = relations(users, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  files: many(files),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(users, {
    fields: [session.userId],
    references: [users.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(users, {
    fields: [account.userId],
    references: [users.id],
  }),
}));


export type ProcessedFilesTable = typeof files.$inferSelect
