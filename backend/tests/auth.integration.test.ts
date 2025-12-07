import type { Express } from "express";
import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { users } from "../src/db/schema";

import type { Pool } from "pg";

type Database = typeof import("../src/config/drizzle").db;

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  process.env.POSTGRESQL_URI ??
  process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "Set TEST_DATABASE_URL or POSTGRESQL_URI to a local Postgres instance for integration tests."
  );
}

if (databaseUrl.includes("neon.tech")) {
  throw new Error("Refusing to run integration tests against a Neon database.");
}

process.env.POSTGRESQL_URI = databaseUrl;
process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? "test-jwt-secret-change-me-please";

describe.sequential("Auth integration", () => {
  let app: Express;
  let db: Database;
  let pool: Pool;

  beforeAll(async () => {
    const drizzle = await import("../src/config/drizzle");
    db = drizzle.db;
    pool = drizzle.pool;

    ({ app } = await import("../src/app"));
  });

  beforeEach(async () => {
    await db.delete(users);
  });

  afterAll(async () => {
    await pool.end();
  });

  it("registers a user with a valid university email", async () => {
    const email = "student@stud.h-da.de";

    const res = await request(app).post("/api/auth/register").send({
      name: "Test User",
      email,
      password: "Password123!",
    });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.emailVerified).toBe(false);

    const [user] = await db.select().from(users).where(eq(users.email, email));
    expect(user).toBeDefined();
    expect(user?.emailVerified).toBe(false);
  });

  it("rejects registration for non-university emails", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: "test@gmail.com",
      password: "Password123!",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("@stud.h-da.de");
  });

  it("prevents duplicate registrations for the same email", async () => {
    const email = "dupe@stud.h-da.de";

    const first = await request(app).post("/api/auth/register").send({
      name: "First User",
      email,
      password: "Password123!",
    });
    expect(first.status).toBe(201);

    const second = await request(app).post("/api/auth/register").send({
      name: "Second User",
      email,
      password: "Password123!",
    });

    expect(second.status).toBe(409);
    expect(second.body.message).toMatch(/already registered/i);
  });

  it("stores the password as a bcrypt hash", async () => {
    const email = "hashcheck@stud.h-da.de";
    const rawPassword = "Password123!";

    const res = await request(app).post("/api/auth/register").send({
      name: "Hash Check",
      email,
      password: rawPassword,
    });

    expect(res.status).toBe(201);

    const [user] = await db.select().from(users).where(eq(users.email, email));
    expect(user?.passwordHash).toBeDefined();
    expect(user?.passwordHash).not.toBe(rawPassword);
    expect(await bcrypt.compare(rawPassword, user?.passwordHash ?? "")).toBe(
      true
    );
  });

  it("blocks login until the email is verified", async () => {
    const email = "needs.verification@stud.h-da.de";
    const password = "Password123!";

    const registerRes = await request(app).post("/api/auth/register").send({
      name: "Verify Later",
      email,
      password,
    });
    expect(registerRes.status).toBe(201);

    const loginRes = await request(app).post("/api/auth/login").send({
      email,
      password,
    });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.message).toMatch(/email not verified/i);
  });

  it("verifies email with a valid code", async () => {
    const email = "verify@stud.h-da.de";
    const password = "Password123!";

    const registerRes = await request(app).post("/api/auth/register").send({
      name: "Verify User",
      email,
      password,
    });
    expect(registerRes.status).toBe(201);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    expect(user?.verificationCode).toBeDefined();

    const verifyRes = await request(app).post("/api/auth/verify-code").send({
      email,
      code: user?.verificationCode,
    });

    expect(verifyRes.status).toBe(200);
    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    expect(updatedUser?.emailVerified).toBe(true);
    expect(updatedUser?.verificationCode).toBeNull();
    expect(updatedUser?.verificationCodeExpires).toBeNull();
  });

  it("returns an error for wrong verification codes", async () => {
    const email = "wrongcode@stud.h-da.de";

    const registerRes = await request(app).post("/api/auth/register").send({
      name: "Wrong Code",
      email,
      password: "Password123!",
    });
    expect(registerRes.status).toBe(201);

    const verifyRes = await request(app).post("/api/auth/verify-code").send({
      email,
      code: "000000",
    });

    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.message).toMatch(/invalid or expired code/i);
  });

  it("returns an error for expired verification codes", async () => {
    const email = "expired@stud.h-da.de";
    const passwordHash = await bcrypt.hash("Password123!", 12);

    await db.insert(users).values({
      email,
      name: "Expired Code",
      passwordHash,
      emailVerified: false,
      verificationCode: "999999",
      verificationCodeExpires: new Date(Date.now() - 60_000),
    });

    const verifyRes = await request(app).post("/api/auth/verify-code").send({
      email,
      code: "999999",
    });

    expect(verifyRes.status).toBe(400);
    expect(verifyRes.body.message).toMatch(/invalid or expired code/i);
  });

  it("allows login after verification and returns a JWT and verified user", async () => {
    const email = "login@stud.h-da.de";
    const password = "Password123!";

    const registerRes = await request(app).post("/api/auth/register").send({
      name: "Login User",
      email,
      password,
    });
    expect(registerRes.status).toBe(201);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const verifyRes = await request(app).post("/api/auth/verify-code").send({
      email,
      code: user?.verificationCode,
    });
    expect(verifyRes.status).toBe(200);

    const loginRes = await request(app).post("/api/auth/login").send({
      email,
      password,
    });

    expect(loginRes.status).toBe(200);
    expect(typeof loginRes.body.token).toBe("string");
    expect(loginRes.body.user.emailVerified).toBe(true);

    const payload = jwt.verify(
      loginRes.body.token,
      process.env.JWT_SECRET as string
    ) as jwt.JwtPayload;

    expect(payload.email).toBe(email);
    expect(payload.userId).toBeDefined();
  });

  it("fails login with an incorrect password", async () => {
    const email = "wrongpass@stud.h-da.de";
    const passwordHash = await bcrypt.hash("CorrectPassword123!", 12);

    await db.insert(users).values({
      email,
      name: "Wrong Pass",
      passwordHash,
      emailVerified: true,
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email,
      password: "BadPassword",
    });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.message).toMatch(/invalid credentials/i);
  });

  it("fails login for an unknown email", async () => {
    const loginRes = await request(app).post("/api/auth/login").send({
      email: "unknown@stud.h-da.de",
      password: "Password123!",
    });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.message).toMatch(/invalid credentials/i);
  });

  it("returns the current user from /api/auth/me when provided a valid token", async () => {
    const email = "meendpoint@stud.h-da.de";
    const password = "Password123!";

    const registerRes = await request(app).post("/api/auth/register").send({
      name: "Me Endpoint",
      email,
      password,
    });
    expect(registerRes.status).toBe(201);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    await request(app).post("/api/auth/verify-code").send({
      email,
      code: user?.verificationCode,
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email,
      password,
    });
    expect(loginRes.status).toBe(200);

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${loginRes.body.token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(email);
    expect(meRes.body.user.emailVerified).toBe(true);
  });

  it("returns 401 from /api/auth/me when no or invalid token is provided", async () => {
    const noTokenRes = await request(app).get("/api/auth/me");
    expect(noTokenRes.status).toBe(401);

    const invalidTokenRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid.token.value");
    expect(invalidTokenRes.status).toBe(401);
  });
});
