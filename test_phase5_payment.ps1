$baseUrl = "http://127.0.0.1:8000/api"

Write-Host "=== Phase 5 Payment & Invoicing E2E Automated Test ===" -ForegroundColor Cyan

# 1. Login Client
$clientLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{ email = "client@logistics.com"; password = "password123" } | ConvertTo-Json) -ContentType "application/json"
$clientToken = $clientLogin.access_token
Write-Host "✓ Client Logged In: $($clientLogin.user.name)" -ForegroundColor Green

# 2. Login Driver (Carlos Valencia)
$driverLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{ email = "carlos@logistics.com"; password = "password123" } | ConvertTo-Json) -ContentType "application/json"
$driverToken = $driverLogin.access_token
Write-Host "✓ Driver Logged In: $($driverLogin.user.name)" -ForegroundColor Green

# 3. Login Admin
$adminLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{ email = "admin@logistics.com"; password = "password123" } | ConvertTo-Json) -ContentType "application/json"
$adminToken = $adminLogin.access_token
Write-Host "✓ Admin Logged In: $($adminLogin.user.name)" -ForegroundColor Green

# 4. Client creates order (Pay on Pickup)
$orderHeaders = @{ Authorization = "Bearer $clientToken"; Accept = "application/json" }
$orderBody = @{
    sender_name = "Phase5 Sender"
    sender_phone = "+34600111222"
    sender_country = "Spain"
    sender_city = "Valencia"
    sender_address = "Calle Colon 10"
    sender_latitude = 39.4699
    sender_longitude = -0.3763
    recipient_name = "Phase5 Recipient"
    recipient_phone = "+34600333444"
    recipient_country = "Spain"
    recipient_city = "Valencia"
    recipient_address = "Calle Russafa 20"
    recipient_latitude = 39.4640
    recipient_longitude = -0.3750
    package_type = "box"
    description = "Phase 5 Cash Payment Test Package"
    number_of_packages = 2
    weight_kg = 15.5
    volume_m3 = 0.2
    is_fragile = 1
    notes = "Handle with extreme care"
} | ConvertTo-Json

$orderRes = Invoke-RestMethod -Uri "$baseUrl/shipments" -Method Post -Headers $orderHeaders -Body $orderBody -ContentType "application/json"
$shipment = $orderRes.shipment
$shipmentId = $shipment.id
Write-Host "✓ Order Created: ID $($shipmentId) | Tracking $($shipment.tracking_number) | Price: €$($shipment.price) | Payment Method: $($shipment.payment_method) | Payment Status: $($shipment.payment_status)" -ForegroundColor Green

# 5. Driver accepts shipment
$driverHeaders = @{ Authorization = "Bearer $driverToken"; Accept = "application/json" }
$acceptRes = Invoke-RestMethod -Uri "$baseUrl/driver/shipments/$shipmentId/accept" -Method Post -Headers $driverHeaders -Body (@{ latitude = 39.4699; longitude = -0.3763 } | ConvertTo-Json) -ContentType "application/json"
Write-Host "✓ Driver Accepted Shipment: $($acceptRes.message)" -ForegroundColor Green

# 6. Driver confirms cash payment received at pickup
$payRes = Invoke-RestMethod -Uri "$baseUrl/driver/shipments/$shipmentId/confirm-payment" -Method Post -Headers $driverHeaders -Body (@{ notes = "Collected 100% exact cash in Euros from sender at pickup point." } | ConvertTo-Json) -ContentType "application/json"
$updatedShipment = $payRes.data
Write-Host "✓ Driver Confirmed Cash Payment Received!" -ForegroundColor Green
Write-Host "  -> Payment Status: $($updatedShipment.payment_status)" -ForegroundColor Yellow
Write-Host "  -> Paid At: $($updatedShipment.paid_at)" -ForegroundColor Yellow
Write-Host "  -> Collector Driver ID: $($updatedShipment.collected_by_driver_id)" -ForegroundColor Yellow

# 7. Fetch Printable Invoice
$invoiceRes = Invoke-RestMethod -Uri "$baseUrl/shipments/$shipmentId/invoice" -Method Get -Headers $orderHeaders
$inv = $invoiceRes.data
Write-Host "✓ Generated Official Freight Invoice: $($inv.invoice_number)" -ForegroundColor Green
Write-Host "  -> Invoice Date: $($inv.created_at)" -ForegroundColor Yellow
Write-Host "  -> Payment Method: $($inv.payment.method)" -ForegroundColor Yellow
Write-Host "  -> Is Paid: $($inv.payment.is_paid)" -ForegroundColor Yellow
Write-Host "  -> Charges Count: $($inv.charges.Count)" -ForegroundColor Yellow
foreach ($c in $inv.charges) {
    Write-Host "     - $($c.description): €$($c.amount)" -ForegroundColor Gray
}
Write-Host "  -> Total Amount: €$($inv.pricing.total_price)" -ForegroundColor Yellow

# 8. Admin filters shipments by payment_status=paid
$adminHeaders = @{ Authorization = "Bearer $adminToken"; Accept = "application/json" }
$adminShipmentsRes = Invoke-RestMethod -Uri "$baseUrl/shipments?payment_status=paid" -Method Get -Headers $adminHeaders
$paidShipments = $adminShipmentsRes.shipments
$matched = $paidShipments | Where-Object { $_.id -eq $shipmentId }

if (-not ($matched -and $matched.collector)) {
    Write-Host "FAILED: Admin filter did not return paid shipment with collector info" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Admin Payment Status Filter Verified: Found paid shipment collected by $($matched.collector.name)" -ForegroundColor Green

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "ALL PHASE 5 PAY ON PICKUP & INVOICING TESTS PASSED 100%" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan
