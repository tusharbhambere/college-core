# Public API (v3) — Frontend Integration Guide

Source: `routes/public/publicRoute.js` · Controllers: `controllers/public/*` · Services: `services/public/*`

## Basics

| Item | Value |
| --- | --- |
| Base URL | `{{BASE_URL}}/api/v3/public` |
| Auth | **None** — every route here is public (website / landing pages) |
| Content-Type (POST/PATCH) | `application/json` |
| Pagination | `?page=1&limit=10` (defaults `page=1`, `limit=10`; non-numeric values fall back to defaults) |

### Response conventions

All responses return HTTP `200` unless the server crashes.

```jsonc
// success
{ "message": "...", "access": true, "<dataKey>": ... }

// missing / bad input handled by the controller
{ "message": "Their is a bug need to fixed immediately", "access": false }

// server error (most routes)
// HTTP 500
{ "message": "Something went wrong. Please try again later.", "access": false }
```

> **Invalid id guard.** Every `:param` below must be a 24‑char hex Mongo ObjectId.
> If it is not (e.g. `undefined`, `_`, `null`), the route short-circuits with:
>
> ```json
> { "message": "You fetch api with proper knownledge", "access": true }
> ```
>
> Note `access` is `true` here — **always check for the data key**, not only `access`.
> Better: don't fire the request until the id is available.

### Suggested client helper

```ts
const PUBLIC = `${BASE_URL}/api/v3/public`;
const isId = (v?: string) => !!v && /^[0-9a-fA-F]{24}$/.test(v);

export async function publicGet<T>(path: string, query?: Record<string, any>) {
  const qs = query ? "?" + new URLSearchParams(
    Object.entries(query).filter(([, v]) => v !== undefined && v !== "")
  ).toString() : "";
  const res = await fetch(`${PUBLIC}${path}${qs}`);
  return (await res.json()) as T;
}
```

---

## 1. Host / Institute core

| Method | Path | Params / Query | Data key(s) |
| --- | --- | --- | --- |
| GET | `/ins/sub/domain/by/host` | **query** `filter_by` (required — the host / sub-domain) | `all_domain` (`null` if not found) |
| GET | `/ins/:id/dash` | `id` = instituteId | institute dashboard object |
| GET | `/ins/:id/announcemnt/query` ⚠️ spelling | `id` = instituteId | `announcement[]` |
| GET | `/ins/one/announcement/:aid` | `aid` = announcementId | `announcement` |
| GET | `/ins/:id/department` | `id` = instituteId · query `which_type` | `institute` (with departments) |
| GET | `/staff/:id/approve-staff/detail/list` | `id` = instituteId · `page`, `limit` | `staffIns[]` |
| GET | `/staff/detail/custom/site/:sid/query` | `sid` = staffId | `staff_detail` |
| GET | `/admission/:id/all/ongoing/application/grouped` | `id` = admissionAdminId | `ads_obj.ongoing[] = { group_name, apps[] }` |
| GET | `/site/:did/all/mou/collab/query` | `did` = departmentId · `page`, `limit`, `batch`, `u_batch`, `search` | `all_mou[]` |
| GET | `/ins/:id/all/universal/batch/query` | `id` = instituteId · `page`, `limit` | `all_batch[]` |
| GET | `/ins/:id/all/merged/department` | `id` = instituteId · `page`, `limit` | `all_depart[]` |

`all_mou[]` item fields: `org_name, institution_industry, durations, link, attach, student_count, staff_count`.
`search` on MOU matches `org_name`, `institution_industry`, `srn`. Use `u_batch` (universal batch) **or** `batch`.

---

## 2. Landing page

| Method | Path | Params / Query / Body | Data key(s) |
| --- | --- | --- | --- |
| GET | `/landing/:id/one/web/profile` | `id` = instituteId | `one_ins` |
| GET | `/landing/:did/all/faculty/query` | `did` = departmentId · `page`, `limit` | `all_staff[]` |
| GET | `/landing/:id/all/pinned/department/query` | `id` = instituteId | `ins` |
| GET | `/landing/:id/one/pinned/department/query` | `id` = instituteId | `ins` |
| GET | `/landing/:lcid/all/examination/object/query` | `lcid` = landingControlId | `landing` |
| POST | `/landing/:aid/new/inquiry/query` | `aid` = admissionAdminId · **body** below | — (`access: true`) |

**Inquiry body** (all optional strings unless noted):

```json
{
  "inquiry_application": "<applicationId>",
  "inquiry_student_name": "",
  "inquiry_student_gender": "",
  "inquiry_student_dob": "",
  "inquiry_student_address": "",
  "inquiry_student_photo": "",
  "inquiry_student_mobileNo": 9999999999,
  "inquiry_student_previous": "",
  "inquiry_student_remark": "",
  "inquiry_student_email": "",
  "inquiry_student_city": "",
  "inquiry_student_message": ""
}
```

If `inquiry_student_email` contains `@`, a confirmation email is sent.

---

## 3. Admission / Finance / Library / Staff CV

| Method | Path | Params / Query | Data key(s) |
| --- | --- | --- | --- |
| GET | `/admission/:aid/application/query` | `aid` = applicationId | `oneApply` |
| GET | `/admission/:aid/dashboard/query` | `aid` = admissionAdminId | `admission`, `roles` |
| GET | `/admission/:aid/all/scholarship` | `aid` = admissionAdminId · `page`, `limit`, `status` | `all_scholar[]` |
| GET | `/admission/:aid/all/document/array` | `aid` = admissionAdminId · `page`, `limit` | `all_docs[]`, `count` |
| GET | `/finance/depart/:did/all/fee/structure` | `did` = departmentId · `page`, `limit`, `filter_by`, `batch_by` | `all_structures[]` |
| GET | `/finance/one/:fsid/structure` | `fsid` = feeStructureId | `structure` |
| GET | `/library/site/books/:lid` | `lid` = libraryId · `page`, `limit`, `search` | `books[]` |
| GET | `/library/site/opac/book/:lid/list/query` | `lid` = libraryId · `page`, `limit`, `search`, `is_search_by` | `books[]` |
| PATCH | `/edit/staff/generate/cv/:sid/query` | `sid` = staffId | `excel_key` (file key of generated CV) |

- `/library/site/books` — `search` matches book name / author. Without `search` returns all books.
- `/library/site/opac/...` — **returns `books: []` when `search` is empty.** `is_search_by`: `subject` · `author` · `book_title` (other values → generic search).

---

## 4. Alumni / Events

| Method | Path | Params / Query / Body | Data key(s) |
| --- | --- | --- | --- |
| GET | `/alumini/:aid/dashboard/query` | `aid` = aluminiId | `one_alumini` |
| GET | `/alumini/:aid/all/prominent/array` | `aid` · `page`, `limit` | `all_prominent[]` |
| GET | `/alumini/:aid/all/feed/question/array` | `aid` · `page`, `limit` | `all_feedback_poll[]` |
| POST | `/alumini/:aid/new/register` | `aid` · **body** below | — |
| GET | `/event/process/manager/:eid/all/events` | `eid` = eventManagerId · `page`, `limit`, `search` | `all_events[]`, `count` |
| GET | `/event/process/one/event/:evid` | `evid` = eventId | `one_event` |
| GET | `/event/dashboard/:id/all/ins/posts` | `id` = instituteId · `page`, `limit`, `p_type` | `post[]`, `postCount`, `totalPage` |
| GET | `/event/dashboard/:eid/all/side/event` | `eid` · `page`, `limit`, `search` | `all_side[]` |
| POST | `/event/dashboard/:id/new/event/inquiry/queue` | `id` = instituteId · **body** below | — |
| PATCH | `/event/dashboard/:id/subscribe/newsletter` | `id` = instituteId · body `{ name, email }` | — |

**Alumni register body**

```json
{
  "name": "", "email": "", "phone_number": 0,
  "graduation_department": "", "pass_year": "",
  "job_status": "", "company_name": "", "company_location": "",
  "higher_study": ""
}
```

**Event inquiry body**

```json
{
  "name": "", "mobile": 0, "email": "",
  "event_type": "", "query": "", "designation": "",
  "event_inquiry_location": ""
}
```

**Newsletter** — `{ access: true, message: "Email Subscribed" }` on success,
`{ access: false, message: "Already Subscribed" }` if the email exists.

---

## 5. Site info / openers / activities / projects

| Method | Path | Params / Query | Data key(s) |
| --- | --- | --- | --- |
| GET | `/site/info/admission/:aid` | `aid` = admissionAdminId | `admission_site` |
| GET | `/site/info/department/:did` | `did` = departmentId | `department_site` |
| GET | `/site/info/library/:lid` | `lid` = libraryId | `library_site` |
| GET | `/site/institute/:id/opener` | `id` = instituteId | `institute` (or `null`) |
| GET | `/site/:did/all/universal/batch/query` | `did` = departmentId | `all_batch[]` |
| GET | `/site/:acid/one/activity/query` | `acid` = activityId | `act` |
| GET | `/site/all/activity/query` | `page`, `limit` (+ filters) | `all_act[]` |
| GET | `/site/all/activity/query/type` | `page`, `limit` (+ type filter) | `all_act[]` |
| GET | `/site/all/projects/query` | `page`, `limit` | `all_act[]` |

---

## 6. Dynamic tabs / student corner / governing body / home / other

| Method | Path | Params / Query | Data key(s) |
| --- | --- | --- | --- |
| GET | `/site/dynamic/:lcid/list/query` | `lcid` = landingControlId | `dynamic_tab[]` |
| GET | `/site/dynamic/nested/:sdid/list/query` | `sdid` · `parent_key` | `data_list[]` |
| GET | `/site/module/dynamic/:lcid/list/query` | `lcid` · `is_flow`, `module_type` | `dynamic_tab[]` |
| GET | `/site/module/dynamic/nested/:mdi/list/query` | `mdi` · `parent_key` | `data_list[]` |
| GET | `/site/student/corner/:lcid/list/query` | `lcid` | `student_corner[]` |
| GET | `/site/governing/:lcid/category/query` | `lcid` · `page`, `limit` | `category_list[]` |
| GET | `/site/governing/:lcid/category/:cid/body/query` | `lcid`, `cid` · `page`, `limit` | `category_body_list[]` |
| GET | `/site/society/governing/:lcid/category/query` | `lcid` · `page`, `limit` | `category_list[]` |
| GET | `/site/society/governing/:lcid/category/:cid/body/query` | `lcid`, `cid` · `page`, `limit` | `category_body_list[]` |
| GET | `/site/home/about/list/:id/query` | `id` · `is_flow` | `home_about_list[]` |
| GET | `/site/home/principal/message/list/:id/query` | `id` · `is_flow` | `home_principal_message_list[]` |
| GET | `/site/other/model/:id/query` | `id` · `is_flow` | `other_data` |
| GET | `/site/category/other/:id/detail/query` | `id` · `activity_type` | `activity_category[]` |
| GET | `/site/other/activity/:cid/detail/query` | `cid` = categoryId | `data_list[]` |
| GET | `/site/author/publish/:id/detail/count` | `id` = instituteId · `is_type` | `detail = { download_count, view_count }` |
| PATCH | `/site/author/publish/:id/update/count` | `id` = instituteId · body below | — |

**Author publish counter body** — every key other than `is_type` is incremented by 1:

```json
{ "is_type": "<type>", "view_count": true }
// or
{ "is_type": "<type>", "download_count": true }
```

Sending only `is_type` returns `{ access: true, message: "No valid increment field found." }`.

---

## 7. Committee / IQAC / NAAC

| Method | Path | Params / Query | Data key(s) |
| --- | --- | --- | --- |
| GET | `/committee/:qid/dashboard` | `qid` = iqacId | `iqac` |
| GET | `/committee/:qcid/custom/dashboard` | `qcid` = customCommitteeId | `custom` |
| GET | `/committee/:qcid/all/composition/query` | `qcid` · `page`, `limit` | `all_com[]` |
| GET | `/committee/:hid/all/sections/query` | `hid` · `page`, `limit` | `all[]` |
| GET | `/committee/:qcid/all/about/query` | `qcid` · `page`, `limit` | `all_com[]` |
| GET | `/committee/:qcid/all/audit/reports/query` | `qcid` · `page`, `limit` | `all_com[]` |
| GET | `/committee/:qcid/all/naac/master/query` | `qcid` | `custom` |
| GET | `/committee/custom/authority/activity/:cid/list/query` | `cid` · `page`, `limit` | `activity[]` |
| GET | `/committee/new/iqac/detail/:iqdid/all/things` | `iqdid` | `q_detail` |
| GET | `/committee/rnd/irins/list/:cid/query` | `cid` | `irins_list[]` |

---

## 8. Gallery

| Method | Path | Params / Query | Data key(s) |
| --- | --- | --- | --- |
| GET | `/committee/image/gallery/institute/:id/category/list` | `id` = instituteId · `bid` (universal batch) | `gallery_category[]` |
| GET | `/committee/image/gallery/:cid/category/images/list` | `cid` = categoryId · `flow`, `batchId` | `image_list[]` |
| GET | `/committee/video/gallery/institute/:id/category/list` | `id` = instituteId · `bid` | `gallery_category[]` |
| GET | `/committee/video/gallery/:cid/category/videos/list` | `cid` = categoryId · `flow`, `batchId` | `video_list[]` |

---

## Frontend gotchas

1. **Typo in path is real:** `/ins/:id/announcemnt/query` (not `announcement`). Same for `alumini`.
2. **Invalid id ⇒ `access: true` with no data.** Guard with `isId()` before calling.
3. **No-response routes on server error.** These controllers only `console.log` on exception and never respond, so the request hangs until your client timeout — set a timeout (e.g. 15s) in the fetch/axios wrapper:
   `/library/site/books/:lid`, `/library/site/opac/...`, `/edit/staff/generate/cv/...`, `/alumini/:aid/new/register`, `/staff/:id/approve-staff/detail/list`, `/event/dashboard/:id/new/event/inquiry/queue`, `/event/dashboard/:id/subscribe/newsletter`.
4. Most list keys fall back to `[]`, but `all_domain` and the opener `institute` can be `null` — default with `?? []` / `?? null` on the client.
