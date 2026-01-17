# 簡易HTTPサーバー起動スクリプト
Write-Host "コミケ買い物リスト・担当割り振りツール - ローカルサーバー起動中..." -ForegroundColor Cyan
Write-Host ""

# Pythonが利用可能かチェック
$pythonExists = Get-Command python -ErrorAction SilentlyContinue

if ($pythonExists) {
    Write-Host "Pythonサーバーを起動します..." -ForegroundColor Green
    Write-Host "ブラウザで以下のURLを開いてください:" -ForegroundColor Yellow
    Write-Host "  http://localhost:8000/index.html" -ForegroundColor Green
    Write-Host ""
    Write-Host "サーバーを停止するには Ctrl+C を押してください" -ForegroundColor Gray
    Write-Host ""
    python -m http.server 8000
} else {
    Write-Host "Pythonが見つかりません。" -ForegroundColor Red
    Write-Host ""
    Write-Host "代替方法:" -ForegroundColor Yellow
    Write-Host "1. Visual Studio Codeで index.html を開く" -ForegroundColor White
    Write-Host "2. 'Live Server' 拡張機能をインストール" -ForegroundColor White
    Write-Host "3. index.html を右クリック → 'Open with Live Server'" -ForegroundColor White
    Write-Host ""
    Write-Host "または、ファイルをGitHub Pagesなどにデプロイしてください。" -ForegroundColor White
    pause
}
