#!/usr/bin/env python3
"""
AutoGuard AI — Stakeholder DOCX Report Generator
Author: Andries Liebenberg
Date: 2026-09-04

This script loads the stakeholder docx template (or generates a fully branded document if run independently),
populates all metadata, executive summaries, component audits, risk registers, and tables,
and outputs 'Development Update - AutoGuard AI - 2026-09-04.docx'.
"""

import os
import sys
from datetime import datetime

try:
    import docx
    from docx.shared import Inches, Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
    from docx.oxml import OxmlElement, parse_xml
    from docx.oxml.ns import nsdecls, qn
except ImportError:
    print("python-docx is required. Run: pip install python-docx")
    sys.exit(1)

PROJECT_NAME = "AutoGuard AI"
PREPARED_BY = "Andries Liebenberg"
REPORT_DATE = "2026-09-04"
OUTPUT_FILENAME = f"Development Update - {PROJECT_NAME} - {REPORT_DATE}.docx"

# Primary Brand Colors (Deep Emerald & Slate Palette)
COLOR_BRAND_PRIMARY = RGBColor(16, 120, 85)     # #107855 Forest Emerald
COLOR_BRAND_DARK = RGBColor(15, 23, 42)         # #0f172a Slate 900
COLOR_BRAND_MUTED = RGBColor(100, 116, 139)     # #64748b Slate 500
COLOR_BRAND_LIGHT_BG = "F0FDF4"                 # Light emerald tint for table headers
COLOR_BORDER = "CBD5E1"

def set_cell_background(cell, hex_color):
    """Set background color of a table cell."""
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=120, bottom=120, left=160, right=160):
    """Set cell padding."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for margin_name, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{margin_name}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def resolve_template_path():
    """Locate the target template across Windows and POSIX environments."""
    user = os.environ.get("USERNAME") or os.environ.get("USER") or "User"
    windows_template = f"C:\\Users\\{user}\\OneDrive - Salaria\\Reports\\it_system_upgrade_report_template.docx"
    local_candidates = [
        windows_template,
        os.path.expanduser(f"~/OneDrive - Salaria/Reports/it_system_upgrade_report_template.docx"),
        "it_system_upgrade_report_template.docx",
        os.path.join(os.path.dirname(__file__), "it_system_upgrade_report_template.docx")
    ]
    for p in local_candidates:
        if os.path.exists(p):
            return p
    return None

def build_docx_report():
    template_path = resolve_template_path()
    if template_path:
        print(f"Found template at: {template_path}. Loading...")
        doc = docx.Document(template_path)
    else:
        print("Template not found locally; building high-fidelity branded document from specifications...")
        doc = docx.Document()

    # Page Setup - Margins
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        
        # Header & Footer setup
        header = section.header
        header_p = header.paragraphs[0] if header.paragraphs else header.add_paragraph()
        header_p.text = f"{PROJECT_NAME} — IT System Modernization & Development Update"
        header_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        header_p.style.font.name = 'Arial'
        header_p.style.font.size = Pt(8.5)
        header_p.style.font.color.rgb = COLOR_BRAND_MUTED

        footer = section.footer
        footer_p = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
        footer_p.text = f"Prepared by {PREPARED_BY}  |  Confidential  |  {REPORT_DATE}"
        footer_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        footer_p.style.font.name = 'Arial'
        footer_p.style.font.size = Pt(8.5)
        footer_p.style.font.color.rgb = COLOR_BRAND_MUTED

    # Document Title Block
    title_p = doc.add_paragraph()
    title_run = title_p.add_run(f"Development Update & System Modernization Report\n{PROJECT_NAME}")
    title_run.font.name = 'Arial'
    title_run.font.size = Pt(22)
    title_run.font.bold = True
    title_run.font.color.rgb = COLOR_BRAND_PRIMARY
    title_p.paragraph_format.space_after = Pt(4)

    subtitle_p = doc.add_paragraph()
    subtitle_run = subtitle_p.add_run("Automotive Forensic Intelligence (GDVF) & Tactical Guardian GPS System")
    subtitle_run.font.name = 'Arial'
    subtitle_run.font.size = Pt(13)
    subtitle_run.font.color.rgb = COLOR_BRAND_DARK
    subtitle_p.paragraph_format.space_after = Pt(16)

    # Metadata Summary Table
    meta_table = doc.add_table(rows=4, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    meta_table.autofit = False
    
    meta_data = [
        ("Project / System Name:", f"{PROJECT_NAME} (v1.0.1)"),
        ("Prepared By:", PREPARED_BY),
        ("Report Date:", REPORT_DATE),
        ("Current System Status:", "Operational / Production-Hardened Hybrid Architecture")
    ]
    
    for row_idx, (k, v) in enumerate(meta_data):
        cell_k = meta_table.cell(row_idx, 0)
        cell_v = meta_table.cell(row_idx, 1)
        cell_k.width = Inches(2.2)
        cell_v.width = Inches(4.6)
        
        cell_k.paragraphs[0].text = k
        cell_k.paragraphs[0].runs[0].font.bold = True
        cell_k.paragraphs[0].runs[0].font.size = Pt(10)
        cell_k.paragraphs[0].runs[0].font.color.rgb = COLOR_BRAND_DARK
        
        cell_v.paragraphs[0].text = v
        cell_v.paragraphs[0].runs[0].font.size = Pt(10)
        
        set_cell_background(cell_k, "F8FAFC")
        set_cell_background(cell_v, "FFFFFF")
        set_cell_margins(cell_k)
        set_cell_margins(cell_v)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # Section 1: Executive Summary
    h1 = doc.add_heading(level=1)
    h1_run = h1.add_run("1. Executive Summary & Strategic Architecture")
    h1_run.font.color.rgb = COLOR_BRAND_PRIMARY
    h1_run.font.size = Pt(15)

    p1 = doc.add_paragraph(
        f"{PROJECT_NAME} is an advanced dual-capability automotive intelligence solution engineered "
        "to combine forensic accident reconditioning analysis with in-motion tactical navigation guidance. "
        "The system runs on a high-resilience Hybrid Local/Cloud architecture, featuring 100% offline edge execution "
        "via local Ollama neural runtimes (Moondream multimodal vision, Llama 3.2 3B reasoning) with automated "
        "failover to Google Gemini 2.5 Pro and Gemini 2.0 Flash Live cloud endpoints."
    )
    p1.style.font.name = 'Arial'
    p1.style.font.size = Pt(10)
    p1.paragraph_format.line_spacing = 1.15

    # Core Capabilities Bullet Points
    bullets = [
        ("6-Phase Forensic Scan:", " Standardized inspection workflow covering Front/Bumper, Side/Jambs, Engine Bay, Undercarriage, Interior/Airbags, and Acoustic Engine sound capture."),
        ("20Hz-20kHz Acoustic DSP Engine:", " Real-time frequency analysis utilizing browser-native Web Audio API with a 20Hz Biquad highpass filter to detect mechanical knock, valve tick, and bearing whir."),
        ("Meteorological Road Grip HUD:", " Open-Meteo telemetry integration mapping precipitation, freezing thresholds, and wind shears to dynamically calculate tire-to-road friction (15%-99%) and enforce safe speed caps."),
        ("Enterprise Storage Modernization:", " Native IndexedDB database ('AutoGuardDB') preventing 5MB localStorage quota crashes during high-resolution photo batching.")
    ]
    for b_title, b_desc in bullets:
        bp = doc.add_paragraph(style='List Bullet')
        r1 = bp.add_run(b_title)
        r1.font.bold = True
        r1.font.color.rgb = COLOR_BRAND_PRIMARY
        r2 = bp.add_run(b_desc)
        r2.font.size = Pt(10)

    # Section 2: Component-by-Component Analysis Table
    h2 = doc.add_heading(level=1)
    h2_run = h2.add_run("2. Component-by-Component Engineering Audit")
    h2_run.font.color.rgb = COLOR_BRAND_PRIMARY
    h2_run.font.size = Pt(15)

    comp_table = doc.add_table(rows=1, cols=4)
    comp_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    comp_table.autofit = False

    headers = ["Component / Module", "Layer", "Responsibilities & Capabilities", "Status"]
    col_widths = [Inches(1.8), Inches(1.1), Inches(3.1), Inches(0.8)]

    hdr_row = comp_table.rows[0]
    for idx, (title, width) in enumerate(zip(headers, col_widths)):
        cell = hdr_row.cells[idx]
        cell.width = width
        cell.paragraphs[0].text = title
        cell.paragraphs[0].runs[0].font.bold = True
        cell.paragraphs[0].runs[0].font.size = Pt(9.5)
        cell.paragraphs[0].runs[0].font.color.rgb = COLOR_BRAND_PRIMARY
        set_cell_background(cell, COLOR_BRAND_LIGHT_BG)
        set_cell_margins(cell)

    components_data = [
        ("CameraView.tsx", "Presentation", "6-Phase AR target framing, base64 photo extraction, audio trigger, GDVF progress HUD.", "Active"),
        ("AcousticVisualizer.tsx", "Audio DSP", "512 FFT AnalyserNode, 20Hz Biquad highpass filter, 5 diagnostic zones (20Hz-20kHz).", "Hardened"),
        ("GuardianView.tsx", "Tactical GPS", "Open-Meteo weather radar card, live road grip meter, speed caps, voice co-pilot.", "Active"),
        ("ReportView.tsx", "Presentation", "Dual forensic/transparency view, HTML-escaped PDF print generator, JSON export.", "Hardened"),
        ("FleetInsights.tsx", "Analytics", "Recharts KPI distribution charts, defect category breakdown, CSV registry export.", "Active"),
        ("DiagnosticMatrix.tsx", "Knowledge", "15+ interactive diagnostic protocols (Acoustic, Exhaust Smoke, Undercarriage, EV).", "Active"),
        ("IntelligenceHub.tsx", "Operations", "Local Ollama model selector & playground, global weather search, NHTSA recalls.", "Active"),
        ("aiService.ts", "Service", "AI provider orchestration facade, observer subscriptions, local-to-cloud failover.", "Active"),
        ("ollamaService.ts", "AI Runtime", "Local REST bridge (/api/ollama) for Moondream vision & Llama 3.2 structured JSON.", "Active"),
        ("geminiService.ts", "Cloud AI", "Gemini 2.5 Pro reasoning, JSON schema enforcement, Gemini 2.0 Live audio duplex.", "Active"),
        ("storageService.ts", "Persistence", "Browser IndexedDB engine (AutoGuardDB) with automatic LocalStorage fallback.", "Hardened"),
        ("weatherService.ts", "Telemetry", "Open-Meteo geocoding & forecast integration, WMO 0-99 code hazard evaluator.", "Active"),
        ("recallService.ts", "Safety", "Asynchronous NHTSA DOT safety recall bulletin queries by 17-digit VIN.", "Active")
    ]

    for comp, layer, resp, status in components_data:
        row = comp_table.add_row()
        for idx, (val, width) in enumerate(zip([comp, layer, resp, status], col_widths)):
            cell = row.cells[idx]
            cell.width = width
            cell.paragraphs[0].text = val
            cell.paragraphs[0].runs[0].font.size = Pt(9)
            if idx == 0:
                cell.paragraphs[0].runs[0].font.bold = True
            if idx == 3:
                cell.paragraphs[0].runs[0].font.bold = True
                cell.paragraphs[0].runs[0].font.color.rgb = COLOR_BRAND_PRIMARY if status == "Hardened" else COLOR_BRAND_DARK
            set_cell_margins(cell, top=80, bottom=80)

    # Section 3: Risk Register & Security Posture
    doc.add_paragraph().paragraph_format.space_after = Pt(8)
    h3 = doc.add_heading(level=1)
    h3_run = h3.add_run("3. Risk Register & Security Posture")
    h3_run.font.color.rgb = COLOR_BRAND_PRIMARY
    h3_run.font.size = Pt(15)

    risk_table = doc.add_table(rows=1, cols=4)
    risk_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    risk_table.autofit = False

    risk_headers = ["Risk ID", "Category", "Description", "Mitigation Status"]
    risk_col_widths = [Inches(1.0), Inches(1.2), Inches(3.2), Inches(1.4)]

    r_hdr_row = risk_table.rows[0]
    for idx, (title, width) in enumerate(zip(risk_headers, risk_col_widths)):
        cell = r_hdr_row.cells[idx]
        cell.width = width
        cell.paragraphs[0].text = title
        cell.paragraphs[0].runs[0].font.bold = True
        cell.paragraphs[0].runs[0].font.size = Pt(9.5)
        cell.paragraphs[0].runs[0].font.color.rgb = COLOR_BRAND_PRIMARY
        set_cell_background(cell, COLOR_BRAND_LIGHT_BG)
        set_cell_margins(cell)

    risks_data = [
        ("RISK-01", "Storage Quota", "LocalStorage 5MB quota exhaustion when storing high-res base64 images.", "RESOLVED: IndexedDB engine implemented."),
        ("RISK-02", "Security / XSS", "Unsanitized user and vehicle strings in window.print() PDF generation.", "RESOLVED: escapeHtml() applied."),
        ("RISK-03", "Audio Quality", "Sub-audible microphone handling rumble skewing low-end FFT classification.", "RESOLVED: 20Hz Biquad filter added."),
        ("RISK-04", "Secrets", "Client-side bundling of cloud API keys in production static builds.", "PLANNED: Edge API gateway proxy.")
    ]

    for r_id, cat, desc, mit in risks_data:
        row = risk_table.add_row()
        for idx, (val, width) in enumerate(zip([r_id, cat, desc, mit], risk_col_widths)):
            cell = row.cells[idx]
            cell.width = width
            cell.paragraphs[0].text = val
            cell.paragraphs[0].runs[0].font.size = Pt(9)
            if idx == 0:
                cell.paragraphs[0].runs[0].font.bold = True
            if idx == 3 and "RESOLVED" in val:
                cell.paragraphs[0].runs[0].font.color.rgb = COLOR_BRAND_PRIMARY
                cell.paragraphs[0].runs[0].font.bold = True
            set_cell_margins(cell, top=80, bottom=80)

    # Section 4: Modernization Roadmap
    doc.add_paragraph().paragraph_format.space_after = Pt(8)
    h4 = doc.add_heading(level=1)
    h4_run = h4.add_run("4. Modernization Milestones & Next Deliverables")
    h4_run.font.color.rgb = COLOR_BRAND_PRIMARY
    h4_run.font.size = Pt(15)

    roadmap = [
        ("Phase 1 (Completed):", " IndexedDB local storage engine, PDF print sanitization, 20Hz Biquad DSP filtering, and living project intelligence repository."),
        ("Phase 2 (30-60 Days):", " Automated regression test suite (Vitest + React Testing Library), PWA offline service worker manifest, and Edge Gateway for cloud secrets."),
        ("Phase 3 (60-90 Days):", " Bluetooth OBD-II ELM327 integration for real-time DTC fault codes and multi-tenant dealership management portal.")
    ]
    for r_title, r_desc in roadmap:
        rp = doc.add_paragraph(style='List Bullet')
        r1 = rp.add_run(r_title)
        r1.font.bold = True
        r1.font.color.rgb = COLOR_BRAND_PRIMARY
        r2 = rp.add_run(r_desc)
        r2.font.size = Pt(10)

    # Sign-off Block
    doc.add_paragraph().paragraph_format.space_after = Pt(16)
    sign_table = doc.add_table(rows=2, cols=2)
    sign_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    sign_table.autofit = False

    s1 = sign_table.cell(0, 0)
    s2 = sign_table.cell(0, 1)
    s1.width = Inches(3.4)
    s2.width = Inches(3.4)

    s1.paragraphs[0].text = f"Report Approved By:\n\n___________________________________\n{PREPARED_BY}\nLead Software Architect"
    s2.paragraphs[0].text = f"Executive Sign-off:\n\n___________________________________\nTechnical Director / Stakeholder\nDate: {REPORT_DATE}"

    for cell in [s1, s2]:
        cell.paragraphs[0].runs[0].font.size = Pt(9.5)
        set_cell_margins(cell, top=140, bottom=140)

    output_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), OUTPUT_FILENAME)
    # Also save in current working directory
    doc.save(OUTPUT_FILENAME)
    print(f"✅ Stakeholder DOCX Report generated successfully: {OUTPUT_FILENAME}")

if __name__ == "__main__":
    build_docx_report()
