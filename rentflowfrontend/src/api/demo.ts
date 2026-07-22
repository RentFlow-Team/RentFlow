/**
 * Demo (offline) mode.
 *
 * RentFlow normally talks to a Spring Boot backend over HTTP. That backend
 * isn't always available — there's nothing running on `localhost:8080`, and on
 * the web target the browser's CORS policy blocks it anyway. Without a fallback
 * the very first call (`POST /auth/login`) fails, so pressing "Login" never
 * navigates and the app appears frozen.
 *
 * To keep the app fully usable for demos, the API client (see `client.ts`) falls
 * back to the canned responses below whenever the backend can't be reached. Real
 * backend errors (401/404/500 …) are NOT masked — only genuine "can't reach the
 * server" network failures trigger the fallback.
 *
 *   • Set `EXPO_PUBLIC_API_URL` to a reachable backend to use real data.
 *   • `EXPO_PUBLIC_DEMO=true`  → always use demo data (skip the network).
 *   • `EXPO_PUBLIC_DEMO=false` → never fall back; surface the network error.
 */
import type {
  AuthResponse,
  GoogleAuthResponse,
  MaintenanceRequest,
  Payment,
  Property,
  PropertyCreated,
  PropertyJoined,
  Review,
  Role,
  Unit,
  UnitSummary,
} from './types';

const demoFlag = process.env.EXPO_PUBLIC_DEMO;

/** Demo data may be used as a fallback (unless explicitly turned off). */
export const demoEnabled = demoFlag !== 'false';

/** Always use demo data and never touch the network. */
export const demoForced = demoFlag === 'true';

// --- Helpers ---------------------------------------------------------------

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** A throwaway session token — the app only checks that one is present. */
const fakeToken = () => `demo.${Math.random().toString(36).slice(2)}.token`;

/** Default new users to the tenant journey; only opt into landlord explicitly. */
function roleFromEmail(email: string): Role {
  return /landlord|owner|admin/i.test(email) ? 'LANDLORD' : 'TENANT';
}

/** Turn "ama.mensah@…" into "Ama Mensah" for a friendlier demo name. */
function nameFromEmail(email: string): string {
  const local = email.split('@')[0] || 'Demo User';
  const pretty = local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
  return pretty || 'Demo User';
}

// --- Canned entities -------------------------------------------------------

const demoProperty: Property = {
  id: 101,
  name: 'Sunrise Apartments',
  address: 'East Legon, Accra',
  rentAmount: 1800,
  inviteCode: 'RF-DEMO01',
};

/** The tenant's own unit (`GET /units/my`, `POST /units/join`). */
const demoUnit: UnitSummary = {
  message: 'Joined successfully',
  unitNumber: 'B4',
  unit: 'B4',
  property: demoProperty.name,
  propertyId: demoProperty.id,
  rentAmount: demoProperty.rentAmount,
  status: 'OCCUPIED',
};

/** Units on the landlord's property (`GET /units/property/{id}`). */
const demoUnits: Unit[] = [
  {
    id: 1,
    unitNumber: 'B4',
    description: '2 bedroom, upper floor',
    rentAmount: 1800,
    inviteCode: 'RF-B4',
    status: 'OCCUPIED',
    tenant: { id: 5, name: 'Ama Mensah', email: 'ama.tenant@rentflow.app', role: 'TENANT' },
    property: demoProperty,
  },
  {
    id: 2,
    unitNumber: 'A1',
    description: '1 bedroom, ground floor',
    rentAmount: 1500,
    inviteCode: 'RF-A1',
    status: 'VACANT',
    tenant: null,
    property: demoProperty,
  },
];

// --- Mutable in-memory store (so actions reflect during a session) ---------

let nextId = 1000;

const store = {
  payments: [
    {
      id: 1,
      totalAmount: 1800,
      amountPaid: 1800,
      balance: 0,
      status: 'PAID',
      dueDate: '2026-06-01',
      paidDate: '2026-05-29',
      property: demoProperty,
    },
    {
      id: 2,
      totalAmount: 1800,
      amountPaid: 0,
      balance: 1800,
      status: 'PENDING',
      dueDate: '2026-07-01',
      paidDate: null,
      property: demoProperty,
    },
  ] as Payment[],
  maintenance: [
    {
      id: 1,
      title: 'Leaking kitchen tap',
      description: 'The kitchen tap drips constantly and wastes water.',
      status: 'IN_PROGRESS',
      submittedDate: '2026-07-12',
      property: demoProperty,
    },
    {
      id: 2,
      title: 'Bedroom light not working',
      description: 'The ceiling light in the main bedroom stopped working.',
      status: 'RESOLVED',
      submittedDate: '2026-06-20',
      property: demoProperty,
    },
  ] as MaintenanceRequest[],
};

// --- Router ----------------------------------------------------------------

/**
 * Resolve a canned response for `method path`. Kept deliberately small: it
 * covers the auth + tenant journeys richly, gives the landlord dashboard enough
 * to render, and falls back to an empty list / object for anything else.
 */
export async function demoRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  await delay(280); // let spinners show, mimicking a real round-trip
  const data = (body ?? {}) as Record<string, unknown>;
  const key = `${method} ${path}`;

  // --- Auth ---------------------------------------------------------------
  if (key === 'POST /auth/login') {
    const email = String(data.email ?? 'tenant@rentflow.app');
    const res: AuthResponse = {
      token: fakeToken(),
      role: roleFromEmail(email),
      name: nameFromEmail(email),
    };
    return res as T;
  }
  if (key === 'POST /auth/register') {
    const res: AuthResponse = {
      token: fakeToken(),
      role: (data.role as Role) ?? 'TENANT',
      name: String(data.name ?? 'Demo User'),
    };
    return res as T;
  }
  if (key === 'POST /auth/google') {
    if (!data.role) {
      const res: GoogleAuthResponse = {
        needsRole: true,
        email: 'demo@rentflow.app',
        name: 'Demo User',
      };
      return res as T;
    }
    const res: GoogleAuthResponse = {
      token: fakeToken(),
      role: data.role as Role,
      name: 'Demo User',
      email: 'demo@rentflow.app',
    };
    return res as T;
  }

  // --- Units (tenant) -----------------------------------------------------
  if (key === 'GET /units/my') return demoUnit as T;
  if (key === 'POST /units/join') return demoUnit as T;
  if (key === 'POST /units/authorize-payment') {
    return { authorizationUrl: 'https://paystack.com/pay/demo', message: 'Demo authorization' } as T;
  }

  // --- Payments -----------------------------------------------------------
  if (key === 'GET /payments/my') return store.payments as T;
  if (method === 'POST' && path.startsWith('/payments/pay/')) {
    const id = Number(path.split('/').pop());
    const amount = Number(data.amount ?? 0);
    const payment = store.payments.find((p) => p.id === id);
    if (payment) {
      const paid = (payment.amountPaid ?? 0) + amount;
      payment.amountPaid = paid;
      payment.balance = Math.max(0, payment.totalAmount - paid);
      payment.status = payment.balance === 0 ? 'PAID' : 'PARTIAL';
      payment.paidDate = '2026-07-22';
      return payment as T;
    }
  }

  // --- Maintenance --------------------------------------------------------
  if (key === 'GET /maintenance/my') return store.maintenance as T;
  if (key === 'POST /maintenance/submit') {
    const created: MaintenanceRequest = {
      id: ++nextId,
      title: String(data.title ?? 'Maintenance request'),
      description: String(data.description ?? ''),
      status: 'PENDING',
      submittedDate: '2026-07-22',
      property: demoProperty,
    };
    store.maintenance = [created, ...store.maintenance];
    return created as T;
  }
  if (method === 'PUT' && path.startsWith('/maintenance/update/')) {
    const id = Number(path.split('/').pop());
    const request = store.maintenance.find((r) => r.id === id);
    if (request) {
      request.status = (data.status as MaintenanceRequest['status']) ?? request.status;
      return request as T;
    }
  }

  // --- Reviews ------------------------------------------------------------
  if (key === 'POST /reviews/submit') {
    const review: Review = {
      id: ++nextId,
      comment: String(data.comment ?? ''),
      rating: Number(data.rating ?? 5),
      type: (data.type as Review['type']) ?? 'TENANT_REVIEW',
      reviewDate: '2026-07-22',
    };
    return review as T;
  }

  // --- Properties / units (landlord) --------------------------------------
  if (key === 'GET /properties/my') return [demoProperty] as T;
  if (key === 'POST /properties/create') {
    const created: PropertyCreated = {
      id: ++nextId,
      name: String(data.name ?? 'New Property'),
      address: String(data.address ?? ''),
      rentAmount: Number(data.rentAmount ?? 0),
      inviteCode: `RF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    };
    return created as T;
  }
  if (key === 'POST /properties/join') {
    const joined: PropertyJoined = {
      message: 'Joined property',
      property: demoProperty.name,
      rentAmount: demoProperty.rentAmount,
    };
    return joined as T;
  }
  if (method === 'GET' && /^\/units\/property\/\d+\/vacant$/.test(path)) {
    return demoUnits.filter((u) => u.status === 'VACANT') as T;
  }
  if (method === 'GET' && /^\/units\/property\/\d+$/.test(path)) {
    return demoUnits as T;
  }
  if (key === 'POST /units/create') {
    const created: Unit = {
      id: ++nextId,
      unitNumber: String(data.unitNumber ?? 'New Unit'),
      description: (data.description as string) ?? null,
      rentAmount: Number(data.rentAmount ?? 0),
      inviteCode: `RF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      status: 'VACANT',
      tenant: null,
      property: demoProperty,
    };
    return created as T;
  }
  if (method === 'GET' && /^\/payments\/property\/\d+$/.test(path)) return store.payments as T;
  if (method === 'GET' && /^\/maintenance\/property\/\d+$/.test(path)) return store.maintenance as T;

  // --- Fallback -----------------------------------------------------------
  // Lists degrade to empty; single-object endpoints to an empty object. The
  // stores treat both as "nothing to show" rather than an error.
  return (method === 'GET' ? [] : {}) as T;
}
