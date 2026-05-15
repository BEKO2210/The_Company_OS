#!/usr/bin/env node
// API Test Script v2 - More thorough edge case testing

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
  console.log('  The Company OS - Extended API Test Suite v2');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Login and get token
  const loginRes = await request('POST', '/api/auth/login', {
    body: { email: 'founder@thecompany.de', password: 'TheCompany2025!' }
  });
  const token = loginRes.body?.data?.token;
  const authHeader = { Authorization: `Bearer ${token}` };

  // Also get admin token
  const adminLogin = await request('POST', '/api/auth/login', {
    body: { email: 'admin@thecompany.de', password: 'admin123' }
  });
  const adminToken = adminLogin.body?.data?.token;
  const adminHeader = { Authorization: `Bearer ${adminToken}` };

  // ─── DEEP AUTH TESTS ───
  console.log('--- DEEP AUTH TESTS ---');

  // Login with wrong password (should be 401, not 400)
  const wrongPw = await request('POST', '/api/auth/login', {
    body: { email: 'founder@thecompany.de', password: 'wrongpassword' }
  });
  log('Login wrong password → 401', wrongPw.status === 401 ? 'PASS' : 'FAIL', `status=${wrongPw.status}`);

  // Login with non-existent email
  const wrongEmail = await request('POST', '/api/auth/login', {
    body: { email: 'nonexistent@thecompany.de', password: 'SomePass123!' }
  });
  log('Login non-existent email → 401', wrongEmail.status === 401 ? 'PASS' : 'FAIL', `status=${wrongEmail.status}`);

  // Login with missing password
  const missingPw = await request('POST', '/api/auth/login', {
    body: { email: 'founder@thecompany.de' }
  });
  log('Login missing password → 400', missingPw.status === 400 ? 'PASS' : 'FAIL', `status=${missingPw.status}`);

  // Login with missing email
  const missingEmail = await request('POST', '/api/auth/login', {
    body: { password: 'somepassword' }
  });
  log('Login missing email → 400', missingEmail.status === 400 ? 'PASS' : 'FAIL', `status=${missingEmail.status}`);

  // Login with empty body
  const emptyBody = await request('POST', '/api/auth/login', { body: {} });
  log('Login empty body → 400', emptyBody.status === 400 ? 'PASS' : 'FAIL', `status=${emptyBody.status}`);

  // Access without token
  const noToken = await request('GET', '/api/agents');
  log('No token → 401', noToken.status === 401 ? 'PASS' : 'FAIL', `status=${noToken.status}`);

  // Access with malformed token
  const badToken = await request('GET', '/api/agents', { headers: { Authorization: 'Bearer invalid' } });
  log('Malformed token → 401', badToken.status === 401 ? 'PASS' : 'FAIL', `status=${badToken.status}`);

  // Access with wrong format (no Bearer)
  const noBearer = await request('GET', '/api/agents', { headers: { Authorization: token } });
  log('Token without Bearer → 401', noBearer.status === 401 ? 'PASS' : 'FAIL', `status=${noBearer.status}`);

  // GET /api/auth/me
  const meRes = await request('GET', '/api/auth/me', { headers: authHeader });
  log('GET /api/auth/me', meRes.ok && meRes.body?.data?.role === 'founder' ? 'PASS' : 'FAIL', `status=${meRes.status}`);

  // Logout (POST /api/auth/logout)
  const logoutRes = await request('POST', '/api/auth/logout', { headers: authHeader });
  log('POST /api/auth/logout', logoutRes.ok ? 'PASS' : 'FAIL', `status=${logoutRes.status}`);

  // ─── DEEP AGENTS TESTS ───
  console.log('\n--- DEEP AGENTS TESTS ---');
  const agentsRes = await request('GET', '/api/agents', { headers: authHeader });
  const agents = agentsRes.body?.data || [];
  log('GET /api/agents (22 agents)', agents.length === 22 ? 'PASS' : 'FAIL', `count=${agents.length}`);

  // Filter by department
  const salesAgents = await request('GET', '/api/agents?department=Sales', { headers: authHeader });
  const sa = salesAgents.body?.data || [];
  const allSales = sa.every(a => a.department === 'Sales');
  log('Filter by department=Sales', salesAgents.ok && allSales ? 'PASS' : 'FAIL', `count=${sa.length}, allSales=${allSales}`);

  // Filter by status
  const activeAgents = await request('GET', '/api/agents?status=active', { headers: authHeader });
  const aa = activeAgents.body?.data || [];
  log('Filter by status=active', activeAgents.ok && aa.length > 0 ? 'PASS' : 'FAIL', `count=${aa.length}`);

  // Filter by non-existent department
  const noDept = await request('GET', '/api/agents?department=NonExistentDept', { headers: authHeader });
  log('Filter by non-existent dept', noDept.ok && (noDept.body?.data?.length === 0 || noDept.body?.data === undefined) ? 'PASS' : 'FAIL', `count=${noDept.body?.data?.length}`);

  // Get agent detail
  const agentId = agents[0]?.id;
  const agentDetail = await request('GET', `/api/agents/${agentId}`, { headers: authHeader });
  log(`GET /api/agents/${agentId}`, agentDetail.ok && agentDetail.body?.data?.id === agentId ? 'PASS' : 'FAIL', `status=${agentDetail.status}`);

  // Non-existent agent → 404
  const nonAgent = await request('GET', '/api/agents/NONEXISTENT-ID-12345', { headers: authHeader });
  log('Non-existent agent → 404', nonAgent.status === 404 ? 'PASS' : 'FAIL', `status=${nonAgent.status}`);

  // Update agent (PUT)
  const updateRes = await request('PUT', `/api/agents/${agentId}`, {
    headers: authHeader,
    body: { name: 'Test Updated Name', version: '99.9' }
  });
  log(`PUT /api/agents/${agentId}`, updateRes.ok && updateRes.body?.data?.name === 'Test Updated Name' ? 'PASS' : 'FAIL', `status=${updateRes.status}`);

  // Update non-existent agent → 404
  const updateNonExistent = await request('PUT', '/api/agents/NONEXISTENT-ID', {
    headers: authHeader,
    body: { name: 'Should Fail' }
  });
  log('PUT non-existent agent → 404', updateNonExistent.status === 404 ? 'PASS' : 'FAIL', `status=${updateNonExistent.status}`);

  // Invalid update body → 400
  const invalidUpdate = await request('PUT', `/api/agents/${agentId}`, {
    headers: authHeader,
    body: { budget_limit: 'not-a-number' }
  });
  log('PUT with invalid data → 400', invalidUpdate.status === 400 ? 'PASS' : 'FAIL', `status=${invalidUpdate.status}`);

  // ─── DEPARTMENTS ───
  console.log('\n--- DEPARTMENTS ---');
  const deptsRes = await request('GET', '/api/departments', { headers: authHeader });
  log('GET /api/departments', deptsRes.ok && deptsRes.body?.data?.length === 14 ? 'PASS' : 'FAIL', `count=${deptsRes.body?.data?.length}`);

  const deptId = deptsRes.body?.data?.[0]?.id;
  const deptDetail = await request('GET', `/api/departments/${deptId}`, { headers: authHeader });
  log(`GET /api/departments/${deptId}`, deptDetail.ok ? 'PASS' : 'FAIL', `status=${deptDetail.status}`);

  log('Non-existent dept → 404', (await request('GET', '/api/departments/NONEXISTENT', { headers: authHeader })).status === 404 ? 'PASS' : 'FAIL');

  // ─── BUSINESS UNITS ───
  console.log('\n--- BUSINESS UNITS ---');
  const buRes = await request('GET', '/api/business-units', { headers: authHeader });
  log('GET /api/business-units', buRes.ok && buRes.body?.data?.length === 8 ? 'PASS' : 'FAIL', `count=${buRes.body?.data?.length}`);

  const buId = buRes.body?.data?.[0]?.id;
  const buDetail = await request('GET', `/api/business-units/${buId}`, { headers: authHeader });
  log(`GET /api/business-units/${buId}`, buDetail.ok ? 'PASS' : 'FAIL', `status=${buDetail.status}`);
  log('Non-existent BU → 404', (await request('GET', '/api/business-units/NONEXISTENT', { headers: authHeader })).status === 404 ? 'PASS' : 'FAIL');

  // ─── PRODUCT STUDIOS ───
  console.log('\n--- PRODUCT STUDIOS ---');
  const psRes = await request('GET', '/api/product-studios', { headers: authHeader });
  log('GET /api/product-studios', psRes.ok && psRes.body?.data?.length === 3 ? 'PASS' : 'FAIL', `count=${psRes.body?.data?.length}`);

  const psId = psRes.body?.data?.[0]?.id;
  log(`GET /api/product-studios/${psId}`, (await request('GET', `/api/product-studios/${psId}`, { headers: authHeader })).ok ? 'PASS' : 'FAIL');
  log('Non-existent studio → 404', (await request('GET', '/api/product-studios/NONEXISTENT', { headers: authHeader })).status === 404 ? 'PASS' : 'FAIL');

  // ─── APPROVALS ───
  console.log('\n--- APPROVALS ---');
  const approvalsRes = await request('GET', '/api/approvals', { headers: authHeader });
  const approvals = approvalsRes.body?.data || [];
  log('GET /api/approvals', approvalsRes.ok ? 'PASS' : 'FAIL', `count=${approvals.length}`);

  // Filter by status
  const pendingApprovals = await request('GET', '/api/approvals?status=pending', { headers: authHeader });
  log('Filter approvals by status=pending', pendingApprovals.ok ? 'PASS' : 'FAIL', `count=${pendingApprovals.body?.data?.length}`);

  // Filter by type
  const paymentApprovals = await request('GET', '/api/approvals?type=payment', { headers: authHeader });
  log('Filter approvals by type=payment', paymentApprovals.ok ? 'PASS' : 'FAIL', `count=${paymentApprovals.body?.data?.length}`);

  // Filter by riskLevel
  const highRiskApprovals = await request('GET', '/api/approvals?riskLevel=high', { headers: authHeader });
  log('Filter approvals by riskLevel=high', highRiskApprovals.ok ? 'PASS' : 'FAIL', `count=${highRiskApprovals.body?.data?.length}`);

  // Get approval detail
  const approvalId = approvals[0]?.id;
  if (approvalId) {
    log(`GET /api/approvals/${approvalId}`, (await request('GET', `/api/approvals/${approvalId}`, { headers: authHeader })).ok ? 'PASS' : 'FAIL');

    // Try to reject with reason (find a pending one first)
    const pendingList = pendingApprovals.body?.data || [];
    const pendingId = pendingList[0]?.id;
    if (pendingId) {
      // Reject a pending approval
      const rejectRes = await request('POST', `/api/approvals/${pendingId}/reject`, {
        headers: authHeader,
        body: { reason: 'Test rejection from automated test' }
      });
      log(`POST /api/approvals/${pendingId}/reject`, rejectRes.ok ? 'PASS' : 'FAIL', `status=${rejectRes.status}`);
    } else {
      log('No pending approvals to reject', 'PASS');
    }
  }

  // ─── AUDIT LOG ───
  console.log('\n--- AUDIT LOG ---');
  const auditRes = await request('GET', '/api/audit-log', { headers: authHeader });
  log('GET /api/audit-log', auditRes.ok && auditRes.body?.data?.length > 0 ? 'PASS' : 'FAIL', `count=${auditRes.body?.data?.length}`);

  // Filter by agent
  const auditByAgent = await request('GET', '/api/audit-log?agent=CEO-Agent', { headers: authHeader });
  log('Filter audit by agent', auditByAgent.ok ? 'PASS' : 'FAIL', `count=${auditByAgent.body?.data?.length}`);

  // Filter by minRisk
  const auditHighRisk = await request('GET', '/api/audit-log?minRisk=50', { headers: authHeader });
  log('Filter audit by minRisk=50', auditHighRisk.ok ? 'PASS' : 'FAIL', `count=${auditHighRisk.body?.data?.length}`);

  // Verify chain
  const auditVerify = await request('GET', '/api/audit-log/verify', { headers: authHeader });
  log('GET /api/audit-log/verify', auditVerify.ok && auditVerify.body?.data?.chainValid !== undefined ? 'PASS' : 'FAIL', `status=${auditVerify.status}`);

  // ─── RISKS ───
  console.log('\n--- RISKS ---');
  const risksRes = await request('GET', '/api/risks', { headers: authHeader });
  const risks = risksRes.body?.data || [];
  log('GET /api/risks', risksRes.ok && risks.length === 32 ? 'PASS' : 'FAIL', `count=${risks.length}`);

  // Filter by category
  const securityRisks = await request('GET', '/api/risks?category=security', { headers: authHeader });
  log('Filter risks by category=security', securityRisks.ok ? 'PASS' : 'FAIL', `count=${securityRisks.body?.data?.length}`);

  // Filter by status
  const activeRisks = await request('GET', '/api/risks?status=active', { headers: authHeader });
  log('Filter risks by status=active', activeRisks.ok ? 'PASS' : 'FAIL', `count=${activeRisks.body?.data?.length}`);

  // Filter by minScore
  const highScoreRisks = await request('GET', '/api/risks?minScore=10', { headers: authHeader });
  log('Filter risks by minScore=10', highScoreRisks.ok ? 'PASS' : 'FAIL', `count=${highScoreRisks.body?.data?.length}`);

  // Get risk detail
  const riskId = risks[0]?.id;
  if (riskId) {
    log(`GET /api/risks/${riskId}`, (await request('GET', `/api/risks/${riskId}`, { headers: authHeader })).ok ? 'PASS' : 'FAIL');
  }
  log('Non-existent risk → 404', (await request('GET', '/api/risks/99999', { headers: authHeader })).status === 404 ? 'PASS' : 'FAIL');

  // Risk matrix
  const riskMatrix = await request('GET', '/api/risks/matrix/overview', { headers: authHeader });
  log('GET /api/risks/matrix/overview', riskMatrix.ok && riskMatrix.body?.data?.matrix ? 'PASS' : 'FAIL', `status=${riskMatrix.status}`);

  // ─── WORKFLOWS ───
  console.log('\n--- WORKFLOWS ---');
  const wfRes = await request('GET', '/api/workflows', { headers: authHeader });
  const wfs = wfRes.body?.data || [];
  log('GET /api/workflows', wfRes.ok && wfs.length === 18 ? 'PASS' : 'FAIL', `count=${wfs.length}`);

  const wfId = wfs[0]?.id;
  if (wfId) {
    log(`GET /api/workflows/${wfId}`, (await request('GET', `/api/workflows/${wfId}`, { headers: authHeader })).ok ? 'PASS' : 'FAIL');
  }
  log('Non-existent workflow → 404', (await request('GET', '/api/workflows/NONEXISTENT', { headers: authHeader })).status === 404 ? 'PASS' : 'FAIL');

  // ─── WORKFLOW INSTANCES ───
  console.log('\n--- WORKFLOW INSTANCES ---');
  const wiRes = await request('GET', '/api/workflow-instances', { headers: authHeader });
  log('GET /api/workflow-instances', wiRes.ok ? 'PASS' : 'FAIL', `status=${wiRes.status}`);

  const wiListRes = await request('GET', '/api/workflows/instances/list', { headers: authHeader });
  log('GET /api/workflows/instances/list', wiListRes.ok ? 'PASS' : 'FAIL', `status=${wiListRes.status}`);

  const wiRunningRes = await request('GET', '/api/workflows/instances/running', { headers: authHeader });
  log('GET /api/workflows/instances/running', wiRunningRes.ok ? 'PASS' : 'FAIL', `status=${wiRunningRes.status}`);

  const wiActiveRes = await request('GET', '/api/workflows/instances/active', { headers: authHeader });
  log('GET /api/workflows/instances/active', wiActiveRes.ok ? 'PASS' : 'FAIL', `status=${wiActiveRes.status}`);

  const runnerStatus = await request('GET', '/api/workflows/runner/status', { headers: authHeader });
  log('GET /api/workflows/runner/status', runnerStatus.ok ? 'PASS' : 'FAIL', `status=${runnerStatus.status}`);

  // ─── FINANCE ───
  console.log('\n--- FINANCE ---');
  const budgetsRes = await request('GET', '/api/finance/budgets', { headers: authHeader });
  log('GET /api/finance/budgets', budgetsRes.ok && budgetsRes.body?.summary ? 'PASS' : 'FAIL', `count=${budgetsRes.body?.data?.length}`);

  const budgetId = budgetsRes.body?.data?.[0]?.id;
  if (budgetId) {
    log(`GET /api/finance/budgets/${budgetId}`, (await request('GET', `/api/finance/budgets/${budgetId}`, { headers: authHeader })).ok ? 'PASS' : 'FAIL');
  }
  log('Non-existent budget → 404', (await request('GET', '/api/finance/budgets/NONEXISTENT', { headers: authHeader })).status === 404 ? 'PASS' : 'FAIL');

  const invoicesRes = await request('GET', '/api/finance/invoices', { headers: authHeader });
  log('GET /api/finance/invoices', invoicesRes.ok ? 'PASS' : 'FAIL', `count=${invoicesRes.body?.data?.length}`);

  // Filter invoices by status
  const sentInvoices = await request('GET', '/api/finance/invoices?status=sent', { headers: authHeader });
  log('Filter invoices by status=sent', sentInvoices.ok ? 'PASS' : 'FAIL', `count=${sentInvoices.body?.data?.length}`);

  const liquidityRes = await request('GET', '/api/finance/liquidity', { headers: authHeader });
  log('GET /api/finance/liquidity', liquidityRes.ok && liquidityRes.body?.data?.currentLiquidity ? 'PASS' : 'FAIL', `liquidity=${liquidityRes.body?.data?.currentLiquidity}`);

  // ─── WORKFORCE ───
  console.log('\n--- WORKFORCE ---');
  const workforceRes = await request('GET', '/api/workforce', { headers: authHeader });
  log('GET /api/workforce', workforceRes.ok && workforceRes.body?.summary ? 'PASS' : 'FAIL', `count=${workforceRes.body?.data?.length}`);

  // Filter workforce
  const availableExperts = await request('GET', '/api/workforce?availability=available', { headers: authHeader });
  log('Filter workforce by availability=available', availableExperts.ok ? 'PASS' : 'FAIL', `count=${availableExperts.body?.data?.length}`);

  const expId = workforceRes.body?.data?.[0]?.id;
  if (expId) {
    log(`GET /api/workforce/${expId}`, (await request('GET', `/api/workforce/${expId}`, { headers: authHeader })).ok ? 'PASS' : 'FAIL');
  }
  log('Non-existent expert → 404', (await request('GET', '/api/workforce/NONEXISTENT', { headers: authHeader })).status === 404 ? 'PASS' : 'FAIL');

  // ─── SETTINGS ───
  console.log('\n--- SETTINGS ---');
  const settingsRes = await request('GET', '/api/settings', { headers: authHeader });
  log('GET /api/settings', settingsRes.ok && settingsRes.body?.data?.settings ? 'PASS' : 'FAIL');

  const toolPerms = await request('GET', '/api/settings/tool-permissions', { headers: authHeader });
  log('GET /api/settings/tool-permissions', toolPerms.ok ? 'PASS' : 'FAIL');

  const modelPolicies = await request('GET', '/api/settings/model-policies', { headers: authHeader });
  log('GET /api/settings/model-policies', modelPolicies.ok ? 'PASS' : 'FAIL');

  // ─── KILL SWITCH ───
  console.log('\n--- KILL SWITCH ---');
  const ksRes = await request('GET', '/api/kill-switch', { headers: authHeader });
  log('GET /api/kill-switch', ksRes.ok ? 'PASS' : 'FAIL');

  const ksCb = await request('GET', '/api/kill-switch/circuit-breaker', { headers: authHeader });
  log('GET /api/kill-switch/circuit-breaker', ksCb.ok ? 'PASS' : 'FAIL');

  const ksHealth = await request('GET', '/api/kill-switch/health', { headers: authHeader });
  log('GET /api/kill-switch/health', ksHealth.ok ? 'PASS' : 'FAIL', `status=${ksHealth.status}`);

  const ksHistory = await request('GET', '/api/kill-switch/history', { headers: authHeader });
  log('GET /api/kill-switch/history', ksHistory.ok ? 'PASS' : 'FAIL');

  const ksFullStatus = await request('GET', '/api/kill-switch/status/full', { headers: authHeader });
  log('GET /api/kill-switch/status/full', ksFullStatus.ok ? 'PASS' : 'FAIL');

  // ─── DASHBOARD ───
  console.log('\n--- DASHBOARD ---');
  const kpiRes = await request('GET', '/api/dashboard/kpis', { headers: authHeader });
  const kpis = kpiRes.body?.data;
  log('GET /api/dashboard/kpis', kpiRes.ok && kpis ? 'PASS' : 'FAIL',
    `agents=${kpis?.agentCount}, liquidity=${kpis?.liquidity}, ks=${kpis?.killSwitchStatus}`);

  const activityRes = await request('GET', '/api/dashboard/activity', { headers: authHeader });
  log('GET /api/dashboard/activity', activityRes.ok ? 'PASS' : 'FAIL', `status=${activityRes.status}`);

  // ─── 404 ROUTE TESTS ───
  console.log('\n--- 404 ROUTE TESTS ---');
  const notFound = await request('GET', '/api/nonexistent', { headers: authHeader });
  log('Non-existent route → 404', notFound.status === 404 ? 'PASS' : 'FAIL', `status=${notFound.status}`);

  const notFoundPost = await request('POST', '/api/agents/nonexistent', { headers: authHeader });
  log('POST non-existent route → 404', notFoundPost.status === 404 ? 'PASS' : 'FAIL', `status=${notFoundPost.status}`);

  // ─── RESPONSE FORMAT CONSISTENCY ───
  console.log('\n--- RESPONSE FORMAT ---');
  const listResponse = agentsRes.body;
  const hasSuccessField = listResponse?.success === true;
  const hasDataField = Array.isArray(listResponse?.data);
  const hasPaginationField = listResponse?.pagination !== undefined;
  log('List response format', hasSuccessField && hasDataField && hasPaginationField ? 'PASS' : 'FAIL',
    `success=${hasSuccessField}, data=${hasDataField}, pagination=${hasPaginationField}`);

  const detailResponse = agentDetail.body;
  const detailHasData = detailResponse?.data && typeof detailResponse.data === 'object';
  log('Detail response format', detailResponse?.success === true && detailHasData ? 'PASS' : 'FAIL');

  const errorResponse = nonAgent.body;
  log('Error response format', errorResponse?.success === false && typeof errorResponse?.error === 'string' ? 'PASS' : 'FAIL',
    `success=${errorResponse?.success}, error=${errorResponse?.error}`);

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
