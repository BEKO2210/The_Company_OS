#!/usr/bin/env node
// API Test Script - Comprehensive endpoint testing

const BASE_URL = 'http://localhost:3001';
const results = [];

function log(label, status, detail = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${label}: ${status}${detail ? ' - ' + detail : ''}`);
  results.push({ label, status, detail });
}

async function request(method, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const init = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };
  if (options.body) {
    init.body = JSON.stringify(options.body);
  }
  try {
    const res = await fetch(url, init);
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, body: json || text, ok: res.ok };
  } catch (err) {
    return { status: 0, body: err.message, ok: false, error: err.message };
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  The Company OS - API Endpoint Testing');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ─── Auth: Login ───
  console.log('--- AUTH ---');
  const loginRes = await request('POST', '/api/auth/login', {
    body: { email: 'founder@thecompany.de', password: 'TheCompany2025!' }
  });
  const token = loginRes.body?.data?.token;
  log('POST /api/auth/login (valid)', loginRes.ok && token ? 'PASS' : 'FAIL',
    `status=${loginRes.status}, hasToken=${!!token}`);

  // Auth error
  const badLogin = await request('POST', '/api/auth/login', {
    body: { email: 'bad@user.de', password: 'wrong' }
  });
  log('POST /api/auth/login (invalid)', badLogin.status === 401 ? 'PASS' : 'FAIL',
    `status=${badLogin.status}`);

  // Missing credentials
  const emptyLogin = await request('POST', '/api/auth/login', { body: {} });
  log('POST /api/auth/login (empty)', emptyLogin.status === 400 ? 'PASS' : 'FAIL',
    `status=${emptyLogin.status}`);

  const authHeader = { Authorization: `Bearer ${token}` };

  // GET /api/auth/me
  const meRes = await request('GET', '/api/auth/me', { headers: authHeader });
  log('GET /api/auth/me', meRes.ok && meRes.body?.data?.email ? 'PASS' : 'FAIL',
    `status=${meRes.status}`);

  // ─── Agents ───
  console.log('\n--- AGENTS ---');
  const agentsRes = await request('GET', '/api/agents', { headers: authHeader });
  log('GET /api/agents', agentsRes.ok && Array.isArray(agentsRes.body?.data) ? 'PASS' : 'FAIL',
    `status=${agentsRes.status}, count=${agentsRes.body?.data?.length}`);

  // Agents with filters
  const agentsFiltered = await request('GET', '/api/agents?department=Sales&status=active', { headers: authHeader });
  log('GET /api/agents?department=Sales&status=active', agentsFiltered.ok ? 'PASS' : 'FAIL',
    `status=${agentsFiltered.status}`);

  // Agent detail
  const agentId = agentsRes.body?.data?.[0]?.id;
  const agentDetail = await request('GET', `/api/agents/${agentId}`, { headers: authHeader });
  log(`GET /api/agents/${agentId}`, agentDetail.ok && agentDetail.body?.data ? 'PASS' : 'FAIL',
    `status=${agentDetail.status}`);

  // Non-existent agent
  const nonExistentAgent = await request('GET', '/api/agents/NONEXISTENT', { headers: authHeader });
  log('GET /api/agents/NONEXISTENT', nonExistentAgent.status === 404 ? 'PASS' : 'FAIL',
    `status=${nonExistentAgent.status}`);

  // PUT agent update
  const agentUpdate = await request('PUT', `/api/agents/${agentId}`, {
    headers: authHeader,
    body: { name: 'Updated Name', status: 'active' }
  });
  log(`PUT /api/agents/${agentId}`, agentUpdate.ok ? 'PASS' : 'FAIL',
    `status=${agentUpdate.status}`);

  // ─── Departments ───
  console.log('\n--- DEPARTMENTS ---');
  const deptsRes = await request('GET', '/api/departments', { headers: authHeader });
  log('GET /api/departments', deptsRes.ok && Array.isArray(deptsRes.body?.data) ? 'PASS' : 'FAIL',
    `status=${deptsRes.status}, count=${deptsRes.body?.data?.length}`);

  const deptId = deptsRes.body?.data?.[0]?.id;
  const deptDetail = await request('GET', `/api/departments/${deptId}`, { headers: authHeader });
  log(`GET /api/departments/${deptId}`, deptDetail.ok ? 'PASS' : 'FAIL',
    `status=${deptDetail.status}`);

  const nonExistentDept = await request('GET', '/api/departments/NONEXISTENT', { headers: authHeader });
  log('GET /api/departments/NONEXISTENT', nonExistentDept.status === 404 ? 'PASS' : 'FAIL',
    `status=${nonExistentDept.status}`);

  // ─── Business Units ───
  console.log('\n--- BUSINESS UNITS ---');
  const buRes = await request('GET', '/api/business-units', { headers: authHeader });
  log('GET /api/business-units', buRes.ok && Array.isArray(buRes.body?.data) ? 'PASS' : 'FAIL',
    `status=${buRes.status}, count=${buRes.body?.data?.length}`);

  const buId = buRes.body?.data?.[0]?.id;
  const buDetail = await request('GET', `/api/business-units/${buId}`, { headers: authHeader });
  log(`GET /api/business-units/${buId}`, buDetail.ok ? 'PASS' : 'FAIL',
    `status=${buDetail.status}`);

  // ─── Product Studios ───
  console.log('\n--- PRODUCT STUDIOS ---');
  const psRes = await request('GET', '/api/product-studios', { headers: authHeader });
  log('GET /api/product-studios', psRes.ok && Array.isArray(psRes.body?.data) ? 'PASS' : 'FAIL',
    `status=${psRes.status}, count=${psRes.body?.data?.length}`);

  const psId = psRes.body?.data?.[0]?.id;
  const psDetail = await request('GET', `/api/product-studios/${psId}`, { headers: authHeader });
  log(`GET /api/product-studios/${psId}`, psDetail.ok ? 'PASS' : 'FAIL',
    `status=${psDetail.status}`);

  // ─── Approvals ───
  console.log('\n--- APPROVALS ---');
  const approvalsRes = await request('GET', '/api/approvals', { headers: authHeader });
  log('GET /api/approvals', approvalsRes.ok && Array.isArray(approvalsRes.body?.data) ? 'PASS' : 'FAIL',
    `status=${approvalsRes.status}, count=${approvalsRes.body?.data?.length}`);

  // Approvals with filters
  const approvalsFiltered = await request('GET', '/api/approvals?status=pending&type=payment', { headers: authHeader });
  log('GET /api/approvals?status=pending&type=payment', approvalsFiltered.ok ? 'PASS' : 'FAIL',
    `status=${approvalsFiltered.status}`);

  const approvalId = approvalsRes.body?.data?.[0]?.id;
  const approvalDetail = await request('GET', `/api/approvals/${approvalId}`, { headers: authHeader });
  log(`GET /api/approvals/${approvalId}`, approvalDetail.ok ? 'PASS' : 'FAIL',
    `status=${approvalDetail.status}`);

  // POST approve
  const approveRes = await request('POST', `/api/approvals/${approvalId}/approve`, { headers: authHeader });
  log(`POST /api/approvals/${approvalId}/approve`, approveRes.ok || approveRes.status === 403 ? 'PASS' : 'FAIL',
    `status=${approveRes.status}`);

  // POST reject
  const rejectRes = await request('POST', `/api/approvals/${approvalId}/reject`, {
    headers: authHeader,
    body: { reason: 'Test rejection' }
  });
  log(`POST /api/approvals/${approvalId}/reject`, rejectRes.ok || rejectRes.status === 400 ? 'PASS' : 'FAIL',
    `status=${rejectRes.status}`);

  // ─── Audit Log ───
  console.log('\n--- AUDIT LOG ---');
  const auditRes = await request('GET', '/api/audit-log', { headers: authHeader });
  log('GET /api/audit-log', auditRes.ok && Array.isArray(auditRes.body?.data) ? 'PASS' : 'FAIL',
    `status=${auditRes.status}, count=${auditRes.body?.data?.length}`);

  const auditVerify = await request('GET', '/api/audit-log/verify', { headers: authHeader });
  log('GET /api/audit-log/verify', auditVerify.ok ? 'PASS' : 'FAIL',
    `status=${auditVerify.status}`);

  // ─── Risks ───
  console.log('\n--- RISKS ---');
  const risksRes = await request('GET', '/api/risks', { headers: authHeader });
  log('GET /api/risks', risksRes.ok && Array.isArray(risksRes.body?.data) ? 'PASS' : 'FAIL',
    `status=${risksRes.status}, count=${risksRes.body?.data?.length}`);

  const risksFiltered = await request('GET', '/api/risks?category=security&status=active', { headers: authHeader });
  log('GET /api/risks?category=security&status=active', risksFiltered.ok ? 'PASS' : 'FAIL',
    `status=${risksFiltered.status}`);

  const riskId = risksRes.body?.data?.[0]?.id;
  const riskDetail = await request('GET', `/api/risks/${riskId}`, { headers: authHeader });
  log(`GET /api/risks/${riskId}`, riskDetail.ok ? 'PASS' : 'FAIL',
    `status=${riskDetail.status}`);

  // Risk matrix
  const riskMatrix = await request('GET', '/api/risks/matrix/overview', { headers: authHeader });
  log('GET /api/risks/matrix/overview', riskMatrix.ok ? 'PASS' : 'FAIL',
    `status=${riskMatrix.status}`);

  // ─── Workflows ───
  console.log('\n--- WORKFLOWS ---');
  const wfRes = await request('GET', '/api/workflows', { headers: authHeader });
  log('GET /api/workflows', wfRes.ok && Array.isArray(wfRes.body?.data) ? 'PASS' : 'FAIL',
    `status=${wfRes.status}, count=${wfRes.body?.data?.length}`);

  const wfId = wfRes.body?.data?.[0]?.id;
  const wfDetail = await request('GET', `/api/workflows/${wfId}`, { headers: authHeader });
  log(`GET /api/workflows/${wfId}`, wfDetail.ok ? 'PASS' : 'FAIL',
    `status=${wfDetail.status}`);

  // ─── Workflow Instances ───
  console.log('\n--- WORKFLOW INSTANCES ---');
  const wiRes = await request('GET', '/api/workflow-instances', { headers: authHeader });
  log('GET /api/workflow-instances', wiRes.ok ? 'PASS' : 'FAIL',
    `status=${wiRes.status}`);

  // ─── Finance ───
  console.log('\n--- FINANCE ---');
  const budgetsRes = await request('GET', '/api/finance/budgets', { headers: authHeader });
  log('GET /api/finance/budgets', budgetsRes.ok && Array.isArray(budgetsRes.body?.data) ? 'PASS' : 'FAIL',
    `status=${budgetsRes.status}`);

  const invoicesRes = await request('GET', '/api/finance/invoices', { headers: authHeader });
  log('GET /api/finance/invoices', invoicesRes.ok && Array.isArray(invoicesRes.body?.data) ? 'PASS' : 'FAIL',
    `status=${invoicesRes.status}`);

  const liquidityRes = await request('GET', '/api/finance/liquidity', { headers: authHeader });
  log('GET /api/finance/liquidity', liquidityRes.ok && liquidityRes.body?.data?.currentLiquidity ? 'PASS' : 'FAIL',
    `status=${liquidityRes.status}`);

  // ─── Workforce ───
  console.log('\n--- WORKFORCE ---');
  const workforceRes = await request('GET', '/api/workforce', { headers: authHeader });
  log('GET /api/workforce', workforceRes.ok && Array.isArray(workforceRes.body?.data) ? 'PASS' : 'FAIL',
    `status=${workforceRes.status}, count=${workforceRes.body?.data?.length}`);

  // ─── Settings ───
  console.log('\n--- SETTINGS ---');
  const settingsRes = await request('GET', '/api/settings', { headers: authHeader });
  log('GET /api/settings', settingsRes.ok && settingsRes.body?.data?.settings ? 'PASS' : 'FAIL',
    `status=${settingsRes.status}`);

  // ─── Kill Switch ───
  console.log('\n--- KILL SWITCH ---');
  const ksRes = await request('GET', '/api/kill-switch', { headers: authHeader });
  log('GET /api/kill-switch', ksRes.ok ? 'PASS' : 'FAIL',
    `status=${ksRes.status}`);

  // ─── Dashboard ───
  console.log('\n--- DASHBOARD ---');
  const kpiRes = await request('GET', '/api/dashboard/kpis', { headers: authHeader });
  log('GET /api/dashboard/kpis', kpiRes.ok && kpiRes.body?.data ? 'PASS' : 'FAIL',
    `status=${kpiRes.status}`);

  // ─── Auth Error Cases ───
  console.log('\n--- AUTH ERROR CASES ---');
  const noAuthAgents = await request('GET', '/api/agents');
  log('GET /api/agents (no token)', noAuthAgents.status === 401 ? 'PASS' : 'FAIL',
    `status=${noAuthAgents.status}`);

  const badToken = await request('GET', '/api/agents', { headers: { Authorization: 'Bearer invalid_token' } });
  log('GET /api/agents (bad token)', badToken.status === 401 ? 'PASS' : 'FAIL',
    `status=${badToken.status}`);

  // ─── Response Format Check ───
  console.log('\n--- RESPONSE FORMAT ---');
  const hasSuccess = agentsRes.body?.success === true;
  const hasData = agentsRes.body?.data !== undefined;
  const hasPagination = agentsRes.body?.pagination !== undefined;
  log('Response format (success+data)', hasSuccess && hasData ? 'PASS' : 'FAIL',
    `success=${hasSuccess}, data=${hasData}, pagination=${hasPagination}`);

  // Error format check
  const errorFormat = nonExistentAgent.body?.success === false && nonExistentAgent.body?.error !== undefined;
  log('Error format (success=false+error)', errorFormat ? 'PASS' : 'FAIL',
    `success=${nonExistentAgent.body?.success}, error=${nonExistentAgent.body?.error}`);

  // ─── Summary ───
  console.log('\n═══════════════════════════════════════════════════════════');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;
  console.log(`  Results: ${passed}/${total} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════');

  if (failed > 0) {
    console.log('\n--- FAILURES ---');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.label}: ${r.detail}`);
    });
  }
}

runTests().catch(console.error);
