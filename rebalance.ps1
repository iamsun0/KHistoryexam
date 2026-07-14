# Rebalance answer positions to a near-uniform distribution within a question file.
# Moves the correct choice (and its position-tied explanation) to a target slot,
# then re-prefixes all choice_explanations with circled numbers.
param(
  [Parameter(Mandatory=$true)][string]$Path
)
$ErrorActionPreference = "Stop"

# Circled digits built from code points (avoid non-ASCII literals in source)
$circled = @()
for ($c = 0x2460; $c -le 0x2464; $c++) { $circled += [char]$c }   # (1)..(5)

function Strip-Prefix([string]$t) {
  if ($null -eq $t) { return "" }
  $t = $t.TrimStart()
  if ($t.Length -gt 0) {
    $code = [int][char]$t[0]
    if ($code -ge 0x2460 -and $code -le 0x2469) { $t = $t.Substring(1).TrimStart() }
  }
  return $t
}

$q = Get-Content -Raw -Encoding UTF8 $Path | ConvertFrom-Json
$n = $q.Count

# Build a balanced list of target positions (1..5) and shuffle
$targets = @()
for ($i = 0; $i -lt $n; $i++) { $targets += (($i % 5) + 1) }
$targets = $targets | Sort-Object { Get-Random }

for ($i = 0; $i -lt $n; $i++) {
  $item = $q[$i]
  $a = [int]$item.answer            # current 1-indexed answer
  $t = [int]$targets[$i]            # target position
  $choices = @($item.choices)
  $exps = @()
  foreach ($e in $item.choice_explanations) { $exps += (Strip-Prefix $e) }

  if ($a -ne $t) {
    $tmp = $choices[$a-1]; $choices[$a-1] = $choices[$t-1]; $choices[$t-1] = $tmp
    $tmp2 = $exps[$a-1];   $exps[$a-1]   = $exps[$t-1];    $exps[$t-1]   = $tmp2
  }
  # re-prefix explanations with circled numbers in new order
  $newExps = @()
  for ($k = 0; $k -lt $exps.Count; $k++) {
    $newExps += ("{0} {1}" -f $circled[$k], $exps[$k])
  }
  $item.choices = $choices
  $item.choice_explanations = $newExps
  $item.answer = $t
}

($q | ConvertTo-Json -Depth 10) | Out-File -Encoding UTF8 $Path
# report
$dist = $q | Group-Object answer | Sort-Object Name | ForEach-Object { "$($_.Name):$($_.Count)" }
Write-Host ("[rebalance] {0} -> {1} items, answer dist {2}" -f (Split-Path -Leaf $Path), $n, ($dist -join " "))
