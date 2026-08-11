from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.units import cm
from datetime import datetime

filename = 'Project_Audit_Report.pdf'
doc = SimpleDocTemplate(
    filename,
    pagesize=A4,
    leftMargin=2*cm,
    rightMargin=2*cm,
    topMargin=2.5*cm,
    bottomMargin=2.5*cm,
)
styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleCenter', parent=styles['Title'], alignment=TA_CENTER, fontSize=28, leading=34))
styles.add(ParagraphStyle(name='Subtitle', parent=styles['Normal'], alignment=TA_CENTER, fontSize=14, leading=20, textColor=colors.darkgray))
styles.add(ParagraphStyle(name='Bullet', parent=styles['Normal'], leftIndent=18, bulletIndent=8, spaceAfter=4))
styles.add(ParagraphStyle(name='Small', parent=styles['Normal'], fontSize=9, leading=12, textColor=colors.gray))

content = []

header_text = 'DK-Services Project Audit Report'
footer_text = 'Confidential Audit Report'


def add_page_number(canvas, doc):
    canvas.saveState()
    width, _ = A4
    canvas.setFont('Helvetica', 9)
    canvas.drawString(2*cm, 1.5*cm, header_text)
    canvas.drawRightString(width - 2*cm, 1.5*cm, f'Page {doc.page}')
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.grey)
    canvas.drawCentredString(width / 2.0, 1.2*cm, footer_text)
    canvas.restoreState()


def add_paragraph(text, style='Normal'):
    content.append(Paragraph(text, styles[style]))

content.append(Spacer(1, 5*cm))
content.append(Paragraph('DK-Services', styles['TitleCenter']))
content.append(Spacer(1, 0.5*cm))
content.append(Paragraph('Project Audit Report', styles['Subtitle']))
content.append(Spacer(1, 1*cm))
content.append(Paragraph('Technology Stack: FastAPI, React + TypeScript, PostgreSQL, SQLAlchemy, JWT, GitHub Actions', styles['Normal']))
content.append(Spacer(1, 0.3*cm))
content.append(Paragraph(f'Report date: {datetime.now():%Y-%m-%d}', styles['Normal']))
content.append(Spacer(1, 10*cm))
content.append(Paragraph('Prepared by: Audit Engine', styles['Small']))
content.append(PageBreak())

content.append(Paragraph('Table of Contents', styles['Heading1']))
for item in [
    'Executive Summary', 'Overall Project Health Score', 'Module Completion Matrix',
    'Architecture Assessment', 'Source Code Quality Assessment', 'Security Assessment',
    'Performance Assessment', 'Testing Coverage', 'Documentation Coverage',
    'Technical Debt', 'Risk Analysis', 'Missing Features', 'Development Roadmap',
    'Action Plan', 'Recommendations', 'Appendix',
]:
    add_paragraph(item, style='Bullet')
content.append(PageBreak())

add_paragraph('Executive Summary', style='Heading1')
add_paragraph(
    'The DK-Services project is a partially completed enterprise CRM and asset management solution. '
    'The backend provides a substantial implementation of domain APIs, authentication, RBAC, and asynchronous persistence. '
    'The frontend includes a broad route structure and many feature pages, but it is not fully complete and lacks systematic test coverage. '
    'Deployment support is present through Docker and GitHub Actions, but pipeline and documentation require strengthening.',
)

add_paragraph('Overall Project Health Score', style='Heading1')
metrics = [
    ['Category', 'Score'],
    ['Architecture', '75'],
    ['Backend', '78'],
    ['Frontend', '70'],
    ['Database', '80'],
    ['API Design', '75'],
    ['Security', '60'],
    ['Performance', '70'],
    ['Maintainability', '68'],
    ['Documentation', '35'],
    ['Testing', '35'],
    ['Overall Project Score', '66'],
]

table = Table(metrics, colWidths=[8*cm, 4*cm])

table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0B4F72')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
]))
content.append(table)
content.append(PageBreak())

add_paragraph('Module Completion Matrix', style='Heading1')
modules = [
    ['Module', 'Purpose', 'Status', 'Completion'],
    ['Authentication', 'Login, logout, refresh, token management', 'Completed', '90%'],
    ['Authorization', 'Role-based permission enforcement', 'In Progress', '70%'],
    ['Backend API', 'Domain-specific REST endpoints', 'In Progress', '75%'],
    ['Frontend', 'React pages, routing, auth flow', 'In Progress', '70%'],
    ['Database', 'SQLAlchemy models, migrations, seed data', 'In Progress', '80%'],
    ['Testing', 'Automated backend/frontend tests', 'Partial', '35%'],
    ['Documentation', 'Project docs and setup guidance', 'Partial', '35%'],
    ['Deployment', 'Docker Compose, CI workflow', 'Partial', '55%'],
]

module_table = Table(modules, colWidths=[4*cm, 6*cm, 3.5*cm, 2.5*cm])
module_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0B4F72')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
]))
content.append(module_table)
content.append(PageBreak())

add_paragraph('Architecture Assessment', style='Heading1')
add_paragraph('The architecture is reasonable for a single-tenant enterprise SaaS application. The backend is implemented with FastAPI, asynchronous SQLAlchemy, and a modular router structure. The frontend uses React, Vite, TypeScript, and Zustand for state management. Key architecture strengths and concerns are noted below.')
add_paragraph('Strengths:', style='Heading2')
for item in [
    'Modular FastAPI routing with domain-specific routers.',
    'Async SQLAlchemy engine with separate SQLite and PostgreSQL support.',
    'Role-based permission system and RBAC role seeding on startup.',
    'Dockerized backend and frontend with Docker Compose for local deployment.',
]:
    add_paragraph(item, style='Bullet')
add_paragraph('Concerns:', style='Heading2')
for item in [
    'Frontend has placeholder pages and incomplete navigation items.',
    'No documented production deployment flow or release migration strategy.',
    'Auth state relies on localStorage without refresh token automation.',
    'Documentation and README files are incomplete or empty.',
]:
    add_paragraph(item, style='Bullet')
content.append(PageBreak())

add_paragraph('Source Code Quality Assessment', style='Heading1')
add_paragraph('The codebase shows good domain modularity, but there are quality gaps in test coverage, duplication, and documentation. The backend has many services and models, while the frontend is structurally organized but lacks validation and reuse in some form implementations.')
add_paragraph('Findings:', style='Heading2')
for item in [
    'Backend services and routes are clearly separated by domain.',
    'Frontend routing and lazy loading are implemented for key sections.',
    'Tests are present for backend support files but not for most business workflows.',
    'No frontend test files were detected in the repository.',
    'Some repeated UI placeholder patterns indicate opportunities for refactor.',
]:
    add_paragraph(item, style='Bullet')
content.append(PageBreak())

add_paragraph('Security Assessment', style='Heading1')
add_paragraph('Core security features exist, including JWT authentication and role-based authorization. However, there are important security risks that must be addressed before production.')
sec_table = [
    ['Area', 'Status', 'Notes'],
    ['JWT Auth', 'Implemented', 'Login, logout, refresh, token revocation supported'],
    ['Role-based Access Control', 'Implemented', 'Permission checks exist across routes'],
    ['Secret Management', 'Weak', 'Default SECRET_KEY and no env sample for production'],
    ['Frontend Auth', 'Incomplete', 'Refresh token stored but not automatically used'],
    ['CORS', 'Dev-focused', 'Only localhost origins configured by default'],
]
sec_t = Table(sec_table, colWidths=[4*cm, 4*cm, 5*cm])
sec_t.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0B4F72')),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ('BACKGROUND', (0, 1), (-1, -1), colors.whitesmoke),
]))
content.append(sec_t)
content.append(PageBreak())

add_paragraph('Performance Assessment', style='Heading1')
for item in [
    'Async SQLAlchemy can support concurrent requests, but query optimization not reviewed in-depth.',
    'Frontend bundles are generated via Vite, though no build analysis is present.',
    'Potential bottlenecks include unused middleware, data-heavy pages, and lack of pagination enforcement.',
    'No explicit caching or rate limiting is implemented in the backend.',
]:
    add_paragraph(item, style='Bullet')
content.append(PageBreak())

add_paragraph('Testing Coverage', style='Heading1')
add_paragraph('Testing coverage is currently limited. The backend includes a small set of pytest tests and shared fixtures, while the frontend has no test suite. CI only runs backend tests.')
add_paragraph('Key points:', style='Heading2')
for item in [
    'Backend: 11 test files found under CRM-System/backend/app/tests.',
    'Frontend: no *.test.tsx or *.spec.tsx files present in CRM-System/frontend/src.',
    'CI: GitHub Actions workflow runs pytest only; no frontend build or tests are validated.',
    'Documentation claims zero tests, which conflicts with existing backend tests and indicates stale docs.',
]:
    add_paragraph(item, style='Bullet')
content.append(PageBreak())

add_paragraph('Documentation Coverage', style='Heading1')
for item in [
    'Root README is missing; CRM-System/README.md is empty.',
    'Docs folder contains architecture and roadmap notes, but not a concise developer setup guide.',
    'Testing documentation is present but not aligned with reality.',
    'No deployment or production configuration docs were found outside Docker Compose.',
]:
    add_paragraph(item, style='Bullet')
content.append(PageBreak())

add_paragraph('Technical Debt', style='Heading1')
for item in [
    'Incomplete frontend pages and placeholders still routed in production app.',
    'Missing frontend automated tests and no test harness configuration.',
    'Default secret values and weak secret management practices.',
    'Auth refresh token flow is stored but not wired into the client.',
    'Sparse CI coverage, with no frontend validation.',
    'Documentation mismatch and empty primary README.',
]:
    add_paragraph(item, style='Bullet')
content.append(PageBreak())

add_paragraph('Risk Analysis', style='Heading1')
add_paragraph('Critical Risks:', style='Heading2')
for item in [
    'Insecure default SECRET_KEY and no production secret guidance.',
    'Incomplete frontend auth refresh flow causes session failure and poor UX.',
    'Lack of frontend tests means regressions are hard to detect.',
    'CI pipeline does not validate frontend or build output.',
]:
    add_paragraph(item, style='Bullet')
add_paragraph('High Risks:', style='Heading2')
for item in [
    'RBAC coverage may be incomplete despite code scaffolding.',
    'Placeholder routes create false product readiness expectations.',
    'Documentation gap increases onboarding and deployment risk.',
]:
    add_paragraph(item, style='Bullet')
content.append(PageBreak())

add_paragraph('Missing Features', style='Heading1')
for item in [
    'Profile page and change password page are placeholders.',
    'New Spare Part page is a placeholder.',
    'Automated frontend tests and E2E tests are absent.',
    'Production deployment documentation and env sample files are missing.',
    'Frontend refresh token automation is not implemented.',
]:
    add_paragraph(item, style='Bullet')
content.append(PageBreak())

add_paragraph('Development Roadmap', style='Heading1')
add_paragraph('Phase 1 — Stabilize core auth, docs, and CI', style='Heading2')
for item in [
    'Implement secure secret configuration and update config defaults.',
    'Add frontend refresh token handling and auth lifecycle.',
    'Create root README and deployment documentation.',
    'Extend CI to cover frontend build and test validation.',
]:
    add_paragraph(item, style='Bullet')
add_paragraph('Phase 2 — Complete missing frontend features', style='Heading2')
for item in [
    'Build actual Profile, Change Password, and Spare Part pages.',
    'Review and complete any placeholder routes and navigation items.',
]:
    add_paragraph(item, style='Bullet')
add_paragraph('Phase 3 — Expand testing and release readiness', style='Heading2')
for item in [
    'Add frontend unit/integration tests and a small E2E suite.',
    'Add backend regression tests for critical workflows and RBAC.',
    'Document production deployment, database migration, and recovery.',
]:
    add_paragraph(item, style='Bullet')
content.append(PageBreak())

add_paragraph('Action Plan', style='Heading1')
for item in [
    'Critical: Secure secrets, set up environment management, and remove insecure defaults.',
    'Critical: Wire refresh token use into frontend client to avoid auth gaps.',
    'High: Populate README and developer setup documentation.',
    'High: Add frontend lint/build/test steps to CI workflow.',
    'Medium: Convert placeholder pages into functioning features.',
    'Medium: Add backend business workflow tests for billing, rentals, and quotations.',
]:
    add_paragraph(item, style='Bullet')
content.append(PageBreak())

add_paragraph('Recommendations', style='Heading1')
for item in [
    'Treat security fixes and auth reliability as immediate priorities.',
    'Use unit tests and E2E smoke tests to validate key user journeys.',
    'Keep the current architecture but improve documentation and maintainability.',
    'Apply incremental risk reduction by addressing CI gaps and placeholder cleanup.',
]:
    add_paragraph(item, style='Bullet')
content.append(PageBreak())

add_paragraph('Appendix', style='Heading1')
add_paragraph('Source files and components reviewed include backend FastAPI routers, SQLAlchemy models, Pydantic schemas, auth and permissions modules, frontend React pages, API client, Zustand store, and Docker/CI configuration. The report is based on repository content as of the audit date.',)
add_paragraph('Key files reviewed:', style='Heading2')
for item in [
    'CRM-System/backend/app/main.py',
    'CRM-System/backend/app/routes/auth.py',
    'CRM-System/backend/app/core/permissions.py',
    'CRM-System/backend/app/core/security.py',
    'CRM-System/backend/app/database/session.py',
    'CRM-System/backend/app/tests/conftest.py',
    'CRM-System/frontend/src/App.tsx',
    'CRM-System/frontend/src/api/client.ts',
    'CRM-System/frontend/src/hooks/useAuth.ts',
    'CRM-System/frontend/src/store/authStore.ts',
    '.github/workflows/ci.yml',
    'CRM-System/docker-compose.yml',
    'CRM-System/Dockerfile.backend',
    'CRM-System/Dockerfile.frontend',
]:
    add_paragraph(item, style='Bullet')

print('Building PDF...')
doc.build(content, onFirstPage=add_page_number, onLaterPages=add_page_number)
print(f'Created {filename}')
