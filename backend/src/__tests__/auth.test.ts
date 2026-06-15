import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * Auth Module Unit Tests
 * Tests JWT tokens, password hashing, and input validation
 * without requiring a running database.
 */

const TEST_JWT_SECRET = 'test-secret-key-for-unit-tests';

describe('JWT Token Generation and Verification', () => {
  const payload = { id: 'user-123', email: 'test@example.com', role: 'USER' };

  it('should generate a valid JWT token', () => {
    const token = jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '7d' });
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts: header.payload.signature
  });

  it('should verify and decode a valid token', () => {
    const token = jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '7d' });
    const decoded = jwt.verify(token, TEST_JWT_SECRET) as typeof payload;

    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
  });

  it('should reject a token signed with a different secret', () => {
    const token = jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '7d' });

    expect(() => {
      jwt.verify(token, 'wrong-secret');
    }).toThrow(jwt.JsonWebTokenError);
  });

  it('should reject an expired token', () => {
    // Create a token that expires immediately
    const token = jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '0s' });

    expect(() => {
      jwt.verify(token, TEST_JWT_SECRET);
    }).toThrow(jwt.TokenExpiredError);
  });

  it('should reject a malformed token', () => {
    expect(() => {
      jwt.verify('not.a.valid.token', TEST_JWT_SECRET);
    }).toThrow(jwt.JsonWebTokenError);
  });

  it('should include iat and exp claims in the token', () => {
    const token = jwt.sign(payload, TEST_JWT_SECRET, { expiresIn: '1h' });
    const decoded = jwt.decode(token) as Record<string, unknown>;

    expect(decoded).toHaveProperty('iat');
    expect(decoded).toHaveProperty('exp');
    expect(typeof decoded.iat).toBe('number');
    expect(typeof decoded.exp).toBe('number');
    expect((decoded.exp as number) - (decoded.iat as number)).toBe(3600); // 1 hour = 3600s
  });

  it('should preserve all payload fields through sign/verify cycle', () => {
    const extendedPayload = { id: 'u-1', email: 'a@b.com', role: 'ADMIN' };
    const token = jwt.sign(extendedPayload, TEST_JWT_SECRET);
    const decoded = jwt.verify(token, TEST_JWT_SECRET) as typeof extendedPayload;

    expect(decoded.id).toBe('u-1');
    expect(decoded.email).toBe('a@b.com');
    expect(decoded.role).toBe('ADMIN');
  });
});

describe('Password Hashing with bcryptjs', () => {
  const plainPassword = 'SecureP@ss123';

  it('should hash a password', async () => {
    const hash = await bcrypt.hash(plainPassword, 10);
    expect(hash).toBeDefined();
    expect(hash).not.toBe(plainPassword);
    expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are 60 chars
  });

  it('should verify a correct password against its hash', async () => {
    const hash = await bcrypt.hash(plainPassword, 10);
    const isMatch = await bcrypt.compare(plainPassword, hash);
    expect(isMatch).toBe(true);
  });

  it('should reject an incorrect password against a hash', async () => {
    const hash = await bcrypt.hash(plainPassword, 10);
    const isMatch = await bcrypt.compare('WrongPassword!', hash);
    expect(isMatch).toBe(false);
  });

  it('should generate different hashes for the same password (salt)', async () => {
    const hash1 = await bcrypt.hash(plainPassword, 10);
    const hash2 = await bcrypt.hash(plainPassword, 10);
    expect(hash1).not.toBe(hash2); // Different salts produce different hashes
  });

  it('should work with the salt rounds used in the app (12)', async () => {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
    const hash = await bcrypt.hash(plainPassword, saltRounds);
    const isMatch = await bcrypt.compare(plainPassword, hash);
    expect(isMatch).toBe(true);
  });

  it('should handle empty string password', async () => {
    const hash = await bcrypt.hash('', 10);
    expect(hash).toBeDefined();
    const isMatch = await bcrypt.compare('', hash);
    expect(isMatch).toBe(true);
  });
});

describe('Input Validation', () => {
  // Email format validation (mirrors express-validator isEmail)
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password length validation (mirrors express-validator isLength({ min: 8 }))
  const isValidPassword = (password: string): boolean => {
    return password.length >= 8;
  };

  describe('Email Format Validation', () => {
    it('should accept a valid email address', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
    });

    it('should accept email with subdomain', () => {
      expect(isValidEmail('user@mail.example.com')).toBe(true);
    });

    it('should accept email with plus addressing', () => {
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject email without @', () => {
      expect(isValidEmail('userexample.com')).toBe(false);
    });

    it('should reject email without domain', () => {
      expect(isValidEmail('user@')).toBe(false);
    });

    it('should reject email without local part', () => {
      expect(isValidEmail('@example.com')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidEmail('')).toBe(false);
    });

    it('should reject email with spaces', () => {
      expect(isValidEmail('user @example.com')).toBe(false);
    });
  });

  describe('Password Length Validation', () => {
    it('should accept password with exactly 8 characters', () => {
      expect(isValidPassword('12345678')).toBe(true);
    });

    it('should accept password with more than 8 characters', () => {
      expect(isValidPassword('MySecurePassword123!')).toBe(true);
    });

    it('should reject password with 7 characters', () => {
      expect(isValidPassword('1234567')).toBe(false);
    });

    it('should reject empty password', () => {
      expect(isValidPassword('')).toBe(false);
    });

    it('should accept very long password', () => {
      expect(isValidPassword('a'.repeat(100))).toBe(true);
    });
  });
});
