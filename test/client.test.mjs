import assert from 'node:assert/strict';
import test from 'node:test';
import { CollegeApiError, createCollegeClient, isId } from '../dist/index.js';

const ID = '0123456789abcdef01234567';
const BASE = 'https://api.college.example';
const response = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});
const expectKind = (kind) => (error) => {
  assert.ok(error instanceof CollegeApiError);
  assert.equal(error.kind, kind);
  return true;
};

test('ObjectId guard accepts hex and prevents invalid IDs reaching the server', async () => {
  assert.equal(isId(ID), true);
  assert.equal(isId(ID.toUpperCase()), true);
  for (const invalid of [undefined, null, '', '_', 'undefined', 'g'.repeat(24), ID + '0', 123]) {
    assert.equal(isId(invalid), false);
    let calls = 0;
    const client = createCollegeClient({ baseUrl: BASE, fetch: async () => {
      calls += 1;
      return response({ access: true, announcement: [] });
    } });
    await assert.rejects(async () => client.institutes.announcements(invalid), expectKind('input'));
    assert.equal(calls, 0);
  }
});

test('success preserves backend fields and accepts documented nullable host mapping', async () => {
  const payload = { access: true, announcement: [{ _id: ID, custom_tenant_field: 42 }], totalPage: 3 };
  const client = createCollegeClient({ baseUrl: BASE, fetch: async () => response(payload) });
  assert.deepEqual(await client.institutes.announcements(ID), payload);
  const unmapped = createCollegeClient({ baseUrl: BASE, fetch: async () => response({ access: true, all_domain: null }) });
  assert.deepEqual(await unmapped.institutes.byHost('unknown.college.example'), { access: true, all_domain: null });
});

test('data contract is checked even when access is true', async () => {
  const fixtures = [
    { access: true, message: 'You fetch api with proper knownledge' },
    { access: true, announcement: {} },
    { access: true, announcement: 'not an array' },
    { access: true, announcement: null },
  ];
  for (const payload of fixtures) {
    const client = createCollegeClient({ baseUrl: BASE, fetch: async () => response(payload) });
    await assert.rejects(client.institutes.announcements(ID), expectKind('response'));
  }
});

test('legacy responses with the expected data key do not require an access field', async () => {
  const payload = { announcement: [] };
  const client = createCollegeClient({ baseUrl: BASE, fetch: async () => response(payload) });
  assert.deepEqual(await client.institutes.announcements(ID), payload);
});

test('HTTP, backend, malformed JSON, and network failures remain distinguishable', async () => {
  const fixtures = [
    ['http', async () => response({ access: false, message: 'Unavailable' }, 503)],
    ['api', async () => response({ access: false, message: 'Already Subscribed' })],
    ['json', async () => new Response('<html>upstream error</html>', { status: 200 })],
    ['network', async () => { throw new TypeError('Connection refused'); }],
  ];
  for (const [kind, fetch] of fixtures) {
    const client = createCollegeClient({ baseUrl: BASE, fetch });
    await assert.rejects(client.institutes.announcements(ID), expectKind(kind));
  }
});

test('admission message-only responses preserve the backend message and contract diagnostics', async () => {
  const payload = { message: 'Admission site info is not updated 😊😊😊', access: true };
  const client = createCollegeClient({ baseUrl: BASE, fetch: async () => response(payload) });
  await assert.rejects(client.site.admission(ID), (error) => {
    assert.ok(error instanceof CollegeApiError);
    assert.equal(error.kind, 'response');
    assert.equal(error.message, payload.message);
    assert.equal(error.details.reason, 'Missing or invalid response data: admission_site.');
    assert.equal(error.details.path, `/site/info/admission/${ID}`);
    assert.deepEqual(error.details.response, payload);
    return true;
  });
});

test('HTTP errors retain the response message, status, path and payload', async () => {
  const payload = { access: false, message: ' Please try after office hours. ' };
  const client = createCollegeClient({ baseUrl: BASE, fetch: async () => response(payload, 429) });
  await assert.rejects(client.institutes.announcements(ID), (error) => {
    assert.equal(error.kind, 'http');
    assert.equal(error.message, payload.message.trim());
    assert.equal(error.details.status, 429);
    assert.equal(error.details.path, `/ins/${ID}/announcemnt/query`);
    assert.deepEqual(error.details.response, payload);
    return true;
  });
});

test('HTTP errors with HTML or empty bodies keep their HTTP classification', async () => {
  for (const body of ['', '<html>Service unavailable</html>']) {
    const client = createCollegeClient({ baseUrl: BASE, fetch: async () => new Response(body, { status: 502 }) });
    await assert.rejects(client.institutes.announcements(ID), (error) => {
      assert.equal(error.kind, 'http');
      assert.equal(error.details.status, 502);
      assert.equal(error.message, 'College API returned HTTP 502.');
      return true;
    });
  }
});

test('blank and non-string backend messages use non-empty diagnostic fallbacks', async () => {
  for (const message of [undefined, null, '', '  ', 42, {}, []]) {
    for (const [status, access, kind] of [[200, false, 'api'], [200, true, 'response'], [503, false, 'http']]) {
      const client = createCollegeClient({ baseUrl: BASE, fetch: async () => response({ access, message }, status) });
      await assert.rejects(client.site.admission(ID), (error) => {
        assert.equal(error.kind, kind);
        assert.ok(error.message.trim());
        return true;
      });
    }
  }
});

test('valid data with an informational message remains successful', async () => {
  const payload = { access: true, announcement: [], message: 'No announcements published yet.' };
  const client = createCollegeClient({ baseUrl: BASE, fetch: async () => response(payload) });
  assert.deepEqual(await client.institutes.announcements(ID), payload);
});

test('failed POST and PATCH responses preserve backend messages without retries', async () => {
  const writes = [
    (client) => client.admissions.inquire(ID, {}),
    (client) => client.alumni.register(ID, {}),
    (client) => client.events.inquire(ID, {}),
    (client) => client.events.subscribe(ID, {}),
    (client) => client.staff.generateCv(ID),
    (client) => client.site.incrementPublishCounts(ID, {}),
  ];
  for (const write of writes) {
    for (const [status, access, kind] of [[200, false, 'api'], [200, undefined, 'response'], [422, false, 'http']]) {
      let calls = 0;
      const payload = { access, message: 'Please complete the required information.' };
      const client = createCollegeClient({ baseUrl: BASE, fetch: async () => {
        calls += 1;
        return response(payload, status);
      } });
      await assert.rejects(write(client), (error) => {
        assert.equal(error.kind, kind);
        assert.equal(error.message, payload.message);
        return true;
      });
      assert.equal(calls, 1);
    }
  }
});

test('timeout bounds a stalled fetch and aborts its signal', async () => {
  let requestSignal;
  const client = createCollegeClient({
    baseUrl: BASE,
    timeoutMs: 25,
    fetch: async (_url, options) => {
      requestSignal = options.signal;
      return new Promise(() => {});
    },
  });
  await assert.rejects(client.institutes.announcements(ID), expectKind('timeout'));
  assert.equal(requestSignal.aborted, true);
});

test('timeout also bounds a response whose headers arrived but whose JSON body stalled', async () => {
  const client = createCollegeClient({
    baseUrl: BASE,
    timeoutMs: 25,
    fetch: async () => ({ ok: true, status: 200, json: async () => new Promise(() => {}) }),
  });
  await assert.rejects(client.institutes.announcements(ID), expectKind('timeout'));
});

test('timeout also bounds reading an HTTP error response body', async () => {
  const client = createCollegeClient({
    baseUrl: BASE,
    timeoutMs: 25,
    fetch: async () => ({ ok: false, status: 503, json: async () => new Promise(() => {}) }),
  });
  await assert.rejects(client.site.admission(ID), expectKind('timeout'));
});

test('caller cancellation is distinct from a client timeout', async () => {
  const controller = new AbortController();
  const client = createCollegeClient({
    baseUrl: BASE,
    signal: controller.signal,
    timeoutMs: 5_000,
    fetch: async () => new Promise(() => {}),
  });
  const request = client.institutes.announcements(ID);
  controller.abort();
  await assert.rejects(request, expectKind('aborted'));
});

test('an already-cancelled request and invalid secondary ObjectId never reach fetch', async () => {
  let calls = 0;
  const controller = new AbortController();
  controller.abort();
  const fetch = async () => {
    calls += 1;
    return response({ access: true, category_body_list: [] });
  };
  const cancelled = createCollegeClient({ baseUrl: BASE, fetch, signal: controller.signal });
  await assert.rejects(cancelled.institutes.announcements(ID), expectKind('aborted'));
  const client = createCollegeClient({ baseUrl: BASE, fetch });
  await assert.rejects(client.site.governingBody(ID, 'undefined'), expectKind('input'));
  assert.equal(calls, 0);
});

test('a write requires an explicit success flag even when no data key is documented', async () => {
  const client = createCollegeClient({ baseUrl: BASE, fetch: async () => response({ message: 'Unrecognised response' }) });
  await assert.rejects(client.events.subscribe(ID, { name: 'Student', email: 'student@example.edu' }), expectKind('response'));
});

test('failed write requests are never automatically retried', async () => {
  for (const failure of ['network', 'timeout', 'api']) {
    let calls = 0;
    const client = createCollegeClient({
      baseUrl: BASE,
      timeoutMs: 25,
      fetch: async () => {
        calls += 1;
        if (failure === 'network') throw new TypeError('Connection lost after sending request');
        if (failure === 'timeout') return new Promise(() => {});
        return response({ access: false, message: 'Already Subscribed' });
      },
    });
    await assert.rejects(client.events.subscribe(ID, { name: 'Student', email: 'student@example.edu' }), expectKind(failure));
    assert.equal(calls, 1);
  }
});
