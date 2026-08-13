"""HTML-to-PDF rendering for printable business documents."""
from __future__ import annotations

from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
DEFAULT_BANK_DETAILS = """LDB Bank
LAK: 010-12-00-0000000 | THB: 010-12-00-0000001 | USD: 010-12-00-0000002

BCEL Bank
LAK: 010-11-00-0000000 | THB: 010-11-00-0000001 | USD: 010-11-00-0000002"""


def _format_money(value: float | None) -> str:
    return f"{value or 0:,.2f}"


def _format_date(value: object | None) -> str:
    return value.strftime("%d %b %Y") if value else "-"


class PdfService:
    """Renders Jinja documents using the shared A4 stylesheet."""

    def __init__(self) -> None:
        self._environment = Environment(
            loader=FileSystemLoader(TEMPLATES_DIR / "html"),
            autoescape=select_autoescape(["html", "xml"]),
        )

    def render_invoice(self, invoice: object) -> bytes:
        # Imported lazily: weasyprint pulls in native Pango/GObject libraries
        # that aren't always present (e.g. a bare Windows dev box), and this
        # keeps that an isolated failure of the PDF endpoint rather than one
        # that blocks the whole app from booting or the test suite from
        # collecting.
        from weasyprint import CSS, HTML

        customer = getattr(invoice, "customer", None)
        template = self._environment.get_template("invoice.html")
        invoice_context = {
            "invoice_number": getattr(invoice, "invoice_number", "-"),
            "issue_date": _format_date(getattr(invoice, "issue_date", None)),
            "due_date": _format_date(getattr(invoice, "due_date", None)),
            "currency": getattr(invoice, "currency", "LAK"),
            "vehicle_make": getattr(invoice, "vehicle_make", None) or "-",
            "vehicle_model": getattr(invoice, "vehicle_model", None) or "-",
            "vehicle_vin": getattr(invoice, "vehicle_vin", None) or "-",
            "vehicle_reg_no": getattr(invoice, "vehicle_reg_no", None) or "-",
            "subtotal": _format_money(getattr(invoice, "subtotal", 0)),
            "tax_rate": f"{getattr(invoice, 'tax_rate', 0):.1f}",
            "tax_amount": _format_money(getattr(invoice, "tax_amount", 0)),
            "discount_amount": _format_money(getattr(invoice, "discount_amount", 0)),
            "total_amount": _format_money(getattr(invoice, "total_amount", 0)),
            "notes": getattr(invoice, "notes", None),
            "bank_details": getattr(invoice, "bank_details", None) or DEFAULT_BANK_DETAILS,
            # Named `line_items`, not `items` — a plain dict's `.items` attribute
            # resolves to the built-in dict.items() method before Jinja2 falls
            # back to key lookup, so `invoice.items` in the template would
            # silently return that method instead of this list.
            "line_items": [
                {
                    "item_code": item.item_code or "-",
                    "description": item.description or "-",
                    "quantity": f"{item.quantity:g}",
                    "unit": item.unit or "-",
                    "unit_rate": _format_money(item.unit_rate),
                    "amount": _format_money(item.amount),
                }
                for item in (getattr(invoice, "items", None) or [])
            ],
        }
        customer_context = {
            "name": " ".join(filter(None, [getattr(customer, "first_name", None), getattr(customer, "last_name", None)])) or "-",
            "company": getattr(customer, "company", None),
            "phone": getattr(customer, "phone", None),
            "email": getattr(customer, "email", None),
        }
        html = template.render(invoice=invoice_context, customer=customer_context)
        return HTML(string=html, base_url=str(TEMPLATES_DIR)).write_pdf(
            stylesheets=[CSS(filename=str(TEMPLATES_DIR / "css" / "style.css"))]
        )
