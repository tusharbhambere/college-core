import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_COLLEGE_TYPE_FIELD_KEY, filterStaff, filterStaffByName, groupDepartments,
  groupStaffByDesignation, isBhavansHost, isSelfFinancingDepartment, partitionStaff, staffFullName,
} from '../dist/domain.js';

const college = (value, key = DEFAULT_COLLEGE_TYPE_FIELD_KEY) => [{ key, value }];
const ids = (people) => people.map((person) => person._id);

test('Bhavan staff groups are exclusive and teaching wins a conflicting classification', () => {
  const staff = Object.freeze([
    { _id: 'teaching', teaching_type: 'Teaching Faculty' },
    { _id: 'technical', teaching_type: 'Non-Teaching', staff_technicality: 'Teaching' },
    { _id: 'non', staff_technicality: 'Non-Teaching Faculty' },
    { _id: 'other' },
  ]);
  const groups = partitionStaff(staff);
  assert.deepEqual(ids(groups.teaching), ['teaching', 'technical']);
  assert.deepEqual(ids(groups.nonTeaching), ['non']);
  assert.deepEqual(ids(groups.other), ['other']);
  assert.equal(staff.length, 4);
});

test('Somani junior and default senior teaching selections preserve exact field and principal exceptions', () => {
  const staff = [
    { _id: 'junior', teaching_type: 'Teaching', staff_dynamic_field: college('Junior College') },
    { _id: 'senior', staff_technicality: 'Teaching Faculty', staff_dynamic_field: college('Senior College') },
    { _id: 'principal', teaching_type: 'Teaching', current_designation: 'Principal' },
    { _id: 'vice', teaching_type: 'Teaching', current_designation: 'Vice Principal' },
    { _id: 'missing', teaching_type: 'Teaching' },
    { _id: 'wrong-key', teaching_type: 'Teaching', staff_dynamic_field: college('Junior College', 'college_type_other') },
    { _id: 'non-teaching-principal', teaching_type: 'Non-Teaching', current_designation: 'Principal' },
  ];
  assert.deepEqual(ids(filterStaff(staff, 'teaching', { policy: 'somani', active: 'junior' })), ['junior', 'principal']);
  for (const active of [undefined, 'senior', 'all']) {
    assert.deepEqual(ids(filterStaff(staff, 'teaching', { policy: 'somani', active })), ['senior']);
  }
  assert.deepEqual(ids(filterStaff(staff, 'teaching', {
    policy: 'somani', active: 'junior', collegeTypeFieldKey: 'college_type_other',
  })), ['principal', 'wrong-key']);
});

test('Somani non-teaching principal inclusion and broad other OR intentionally overlap', () => {
  const staff = [
    { _id: 'vice', teaching_type: 'Teaching', staff_technicality: 'Teaching', current_designation: 'Vice Principal' },
    { _id: 'one-known', teaching_type: 'Teaching' },
    { _id: 'non', teaching_type: 'Non-Teaching', staff_technicality: 'Non-Teaching Faculty' },
    { _id: 'neither' },
  ];
  assert.deepEqual(ids(filterStaff(staff, 'non-teaching', { policy: 'somani' })), ['vice', 'non']);
  assert.deepEqual(ids(filterStaff(staff, 'other', { policy: 'somani' })), ['one-known', 'neither']);
});

test('designation groups retain source precedence and relative order', () => {
  const staff = [
    { _id: 'vice', current_designation: 'VICE PRINCIPAL' },
    { _id: 'principal', current_designation: 'Principal' },
    { _id: 'supervisor', current_designation: 'Supervisor' },
    { _id: 'clerk', current_designation: 'Head Clerk' },
    { _id: 'superintendent', current_designation: 'Superintendent' },
    { _id: 'staff' },
  ];
  const teaching = groupStaffByDesignation(staff, 'teaching');
  assert.deepEqual(ids(teaching.principal), ['principal']);
  assert.deepEqual(ids(teaching.leader), ['vice', 'supervisor']);
  assert.deepEqual(ids(teaching.mid), []);
  assert.deepEqual(ids(teaching.staff), ['clerk', 'superintendent', 'staff']);
  const non = groupStaffByDesignation(staff, 'non-teaching');
  assert.deepEqual(ids(non.leader), ['vice']);
  assert.deepEqual(ids(non.mid), ['clerk', 'superintendent']);
  assert.deepEqual(ids(non.staff), ['supervisor', 'staff']);
});

test('staff names omit empty period placeholders and search intersects exact department', () => {
  const person = {
    _id: 'a', staffFirstName: 'Anita', staffMiddleName: '.', staffLastName: 'Rao',
    staff_dynamic_field: [{ key: 'prefix_1', value: 'Dr.' }], staff_department: { dName: 'Science' },
  };
  const other = { _id: 'b', staffFirstName: 'Anita', staffLastName: 'Shah', staff_department: { dName: 'Arts' } };
  assert.equal(staffFullName(person), 'Dr. Anita Rao');
  assert.equal(staffFullName(person, { includePrefix: false }), 'Anita Rao');
  assert.equal(staffFullName({ staffFirstName: '..', staffMiddleName: ' ' }), '');
  assert.deepEqual(ids(filterStaffByName([person, other], ' ANITA ', { departmentName: 'Science' })), ['a']);
  assert.deepEqual(ids(filterStaffByName([person, other], '', { departmentName: 'all' })), ['a', 'b']);
});

test('only configured Bhavan host Senior College departments receive the self-financing split', () => {
  const departments = Object.freeze([
    { _id: 'z', dName: 'Zoology' }, { _id: 'it', dName: 'B Sc (I T)' },
    { _id: 'af', dName: 'B.Com (A&F)' }, { _id: 'a', dName: 'Arts' },
    { _id: 'mcom', dName: 'M.COM' }, { _id: 'ms', dName: 'B.COM (M.S.)' },
  ]);
  const grouped = groupDepartments(departments, { host: 'bhavanschowpatty.ac.in', dependentType: 'Senior College' });
  assert.deepEqual(ids(grouped.regular), ['a', 'z']);
  assert.deepEqual(new Set(ids(grouped.selfFinancing)), new Set(['it', 'af', 'mcom', 'ms']));
  assert.deepEqual(ids(departments), ['z', 'it', 'af', 'a', 'mcom', 'ms']);
  assert.equal(groupDepartments(departments, { host: 'other.ac.in', dependentType: 'Senior College' }).selfFinancing.length, 0);
  assert.deepEqual(groupDepartments(departments, { host: 'other.ac.in' }).regular, departments);
  assert.equal(groupDepartments(departments, { host: 'bhavanschowpatty.ac.in', dependentType: 'Junior College' }).selfFinancing.length, 0);
  assert.equal(isSelfFinancingDepartment({ dName: 'B.Sc. (I.T.)' }), true);
  assert.equal(isSelfFinancingDepartment({ dName: 'M.COM (Additional)' }), false);
  assert.equal(isBhavansHost('bhavanschowpatty.qviple.com'), true);
  assert.equal(isBhavansHost('other.bhavanschowpatty.ac.in'), false);
});
