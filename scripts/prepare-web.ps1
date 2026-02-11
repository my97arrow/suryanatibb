New-Item -ItemType Directory -Path web -Force | Out-Null
Copy-Item index.html, admin.html, details.html -Destination web -Force
Copy-Item css, js, images, assets -Destination web -Recurse -Force
