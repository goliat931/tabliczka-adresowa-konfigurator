# Konfigurator tabliczek — Osiedle Wilga

Statyczna wersja konfiguratora dla GitHub Pages. Nie wymaga serwera ani wysyłania danych adresowych: podgląd, SVG i PNG są tworzone lokalnie w przeglądarce.

## Funkcje

- 40 × 35 cm i 20 × 17,5 cm, z eksportem PNG w 300 DPI.
- Nazwa ulicy wielkimi literami, małymi literami lub w zapisie wpisanym; litery numeru domu są zawsze wielkie.
- Większy, wyśrodkowany układ nazwy ulicy po wyłączeniu prefiksu „ULICA”.
- Pełna lista 30 miejscowości gminy Wilga, Garwolin i własna nazwa.
- Dobór herbu Wilgi lub Garwolina, możliwość rezygnacji z herbu, palety kolorów i własnych barw.
- Ostrzeżenie o wymaganej palecie „Zieleń Wilgi” wyłącznie dla Osiedla Wilga.

## Lokalny podgląd

Otwórz `index.html` przez lokalny serwer plików, np.:

```powershell
py -m http.server 8000
```

Następnie przejdź pod `http://127.0.0.1:8000/`. Bez serwera przeglądarka może blokować lokalne zasoby `fetch`.

## Publikacja

Repozytorium publikuje tę zawartość przez GitHub Actions po wypchnięciu zmian do `main`. W ustawieniach repozytorium wybierz **Settings → Pages → Build and deployment → GitHub Actions**. Po udanym wdrożeniu strona będzie dostępna pod adresem `https://goliat931.github.io/tabliczka-adresowa-konfigurator/`.

## Font i licencja

`assets/font-paths.json` zawiera krzywe obrysów Oswald Regular, Medium i Bold przekształcone z lokalnie zainstalowanych plików TTF. Do odtworzenia pliku potrzebny jest Python z `fonttools` oraz trzy warianty czcionki Oswald:

```powershell
python tools/build_font_paths.py --regular Oswald-Regular.ttf --medium Oswald-Medium.ttf --bold Oswald-Bold.ttf
```

Informacja o licencji Oswald znajduje się w `assets/OSWALD-OFL.txt`. Herby pochodzą z plików projektu.
