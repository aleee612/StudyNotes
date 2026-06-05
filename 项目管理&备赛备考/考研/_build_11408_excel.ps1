
$rows = Get-Content -LiteralPath 'D:\Obsidian Vault\项目管理&备赛备考\考研\2026_11408_院校专业_官方汇总.json' -Raw | ConvertFrom-Json
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Add()
$ws = $wb.Worksheets.Item(1)
$ws.Name = '11408_2026'
if ($rows.Count -eq 0) {
  $ws.Cells.Item(1,1) = '无数据'
} else {
  $props = $rows[0].PSObject.Properties.Name
  for ($c=0; $c -lt $props.Count; $c++) { $ws.Cells.Item(1,$c+1) = $props[$c] }
  $r = 2
  foreach($row in $rows){
    for($c=0; $c -lt $props.Count; $c++){
      $name = $props[$c]
      $ws.Cells.Item($r,$c+1) = [string]$row.$name
    }
    $r++
  }
  $used = $ws.UsedRange
  $used.EntireColumn.AutoFit() | Out-Null
  $used.Borders.LineStyle = 1
  $ws.Rows.Item(1).Font.Bold = $true
  $excel.ActiveWindow.SplitRow = 1
  $excel.ActiveWindow.FreezePanes = $true
}
$out='D:\\Obsidian Vault\\项目管理&备赛备考\\考研\\2026_11408_院校专业_官方汇总.xlsx'
$wb.SaveAs($out, 51)
$wb.Close($true)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($ws) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($wb) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
[GC]::Collect(); [GC]::WaitForPendingFinalizers()
Write-Output $out
