$cfg = "puppeteer-config.json"
$src = "docs/diagrams"
$svg = "docs/svg"
$png = "docs/png"

$diagrams = @(
    @{ file="c4_context";          w=1800; h=1100 },
    @{ file="c4_container";        w=1800; h=1000 },
    @{ file="c4_component";        w=2400; h=1800 },
    @{ file="er_diagram";          w=2400; h=2000 },
    @{ file="seq_auth";            w=1400; h=2000 },
    @{ file="seq_rental";          w=1600; h=2400 },
    @{ file="seq_maintenance";     w=1600; h=2000 },
    @{ file="state_lead";          w=1400; h=700  },
    @{ file="state_quotation";     w=1400; h=900  },
    @{ file="state_rental";        w=1400; h=1000 },
    @{ file="state_forklift";      w=1600; h=700  },
    @{ file="state_invoice";       w=1400; h=900  },
    @{ file="workflow_sales";      w=1600; h=2000 },
    @{ file="workflow_maintenance"; w=1400; h=1800 },
    @{ file="workflow_inventory";  w=1200; h=1800 },
    @{ file="infrastructure";      w=1800; h=1600 }
)

$total = $diagrams.Count
$i = 0

foreach ($d in $diagrams) {
    $i++
    $input  = "$src/$($d.file).md"
    $outSvg = "$svg/$($d.file).svg"
    $outPng = "$png/$($d.file).png"
    $w = $d.w
    $h = $d.h

    Write-Host "[$i/$total] $($d.file) — SVG..."
    npx @mermaid-js/mermaid-cli -i $input -o $outSvg -w $w -H $h -p $cfg -q 2>&1 | Out-Null

    Write-Host "[$i/$total] $($d.file) — PNG..."
    npx @mermaid-js/mermaid-cli -i $input -o $outPng -w $w -H $h -p $cfg -q 2>&1 | Out-Null

    Write-Host "   done"
}

Write-Host "`nAll $total diagrams rendered."
