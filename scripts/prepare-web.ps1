New-Item -ItemType Directory -Path web -Force | Out-Null
Copy-Item index.html, admin.html, details.html, owner.html -Destination web -Force
Copy-Item css, js, images -Destination web -Recurse -Force
if (Test-Path -Path data) {
  Copy-Item data -Destination web -Recurse -Force
}
if (Test-Path -Path assets) {
  Copy-Item assets -Destination web -Recurse -Force
}
