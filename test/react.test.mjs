import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as ui from '../dist/react/index.js';

const item = { id: 'n1', title: 'Exam timetable', description: 'Semester • Theory • Practical', date: '2026-11-01',
  href: '/explore/?module=announcement&id=6ae982023d7621efc08a533a', files: [{ label: 'Timetable', url: 'https://cdn.example/t.pdf' }] };

test('react entry exports the provider, hooks and components', () => {
  for (const name of ['CollegeProvider', 'CollegeUIProvider', 'useCollege', 'useCollegeQuery', 'useCollegeMutation', 'useWebsitePage',
    'Button', 'Section', 'SectionHeading', 'PageHero', 'Lightbox', 'ContentList', 'ContentDetail', 'BoardItem', 'LiveModule',
    'LiveError', 'LiveEmpty', 'LiveLoading', 'ExploreView', 'MediaGallery', 'FacultyDirectory', 'LibrarySearch',
    'AlumniRegistration', 'NewsletterSubscribe', 'TenantFlashNotice', 'LiveNoticesTicker', 'AnnouncementTicker']) {
    assert.equal(typeof ui[name], 'function', name);
  }
});

test('components render with default adapters (plain <a>/<img>) outside any framework', () => {
  const html = renderToStaticMarkup(h(ui.CollegeProvider, { host: 'college.example', apiBaseUrl: 'https://api.example' }, h(ui.ContentList, { items: [item], layout: 'list' })));
  assert.match(html, /href="\/explore\?module=announcement&amp;id=6ae982023d7621efc08a533a"/);
  assert.match(html, /Exam timetable/);
  assert.match(html, /<li[^>]*>.*Theory/);
  const button = renderToStaticMarkup(h(ui.Button, { href: '/explore/?module=notices' }, 'Notices'));
  assert.match(button, /<a [^>]*href="\/explore\?module=notices"/);
});

test('CollegeUIProvider swaps the link component and explore route', () => {
  const Link = ({ href, children, ...props }) => h('a', { ...props, href, 'data-router': 'custom' }, children);
  const html = renderToStaticMarkup(h(ui.CollegeUIProvider, { Link, explorePath: '/college' },
    h(ui.Button, { href: '/explore/?module=notices' }, 'Notices'),
    h(ui.LiveEmpty, { actions: true })));
  assert.match(html, /data-router="custom"[^>]*>|href="\/college\?module=notices"/);
  assert.match(html, /href="\/college\?module=notices"/);
  assert.match(html, /href="\/contact"/);
  assert.equal(ui.toLocalHref('/notices?nid=1', { explorePath: '/c', contactPath: '/contact', legacyRoutes: true }), '/c?nid=1&id=1&module=announcement');
});

test('LiveError shows a user-facing message and retry', () => {
  const html = renderToStaticMarkup(h(ui.LiveError, { error: new Error('Server is Busy'), onRetry: () => {} }));
  assert.match(html, /role="alert"/);
  assert.match(html, /Server is Busy/);
  assert.match(html, /Try again/);
});
