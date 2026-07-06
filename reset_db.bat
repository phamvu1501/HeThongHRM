@echo off
echo ========================================================
echo KHOI PHUC LAI TOAN BO CO SO DU LIEU SUPABASE (POSTGRESQL)
echo ========================================================
echo.
echo Buoc 1/2: Tao lai cac bang theo cau truc trong schema.prisma...
call npx prisma db push --accept-data-loss

echo.
echo Buoc 2/2: Bom lai du lieu vao he thong tu file Excel...
call npx tsx scripts/seed.ts

echo.
echo ========================================================
echo KHOI PHUC THANH CONG!
echo ========================================================
pause
