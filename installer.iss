; ============================================================
;  YT-DLP Importer — Instalador para Adobe Premiere Pro (CEP)
;  Compilar:  "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
;  Salida:    dist\YTDLP-Importer-Setup-v1.0.0.exe
; ============================================================

#define AppName      "YT-DLP Importer"
#define AppVersion   "1.0.0"
#define AppPublisher "rodrmilano00"
#define BundleId     "com.ytdlp.premierepanel"

[Setup]
AppId={{6F2B8C4A-1D3E-4A5F-9B7C-2E8D4A6F1C3B}}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
; Ruta por defecto: carpeta de extensiones CEP del usuario (Adobe)
DefaultDirName={userappdata}\Adobe\CEP\extensions
UsePreviousAppDir=no
DirExistsWarning=no
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=dist
OutputBaseFilename=YTDLP-Importer-Setup-v{#AppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName={#AppName} (Premiere Pro)

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "com.ytdlp.premierepanel\*"; \
    DestDir: "{app}\{#BundleId}"; \
    Flags: ignoreversion recursesubdirs createallsubdirs

[Registry]
; PlayerDebugMode: requerido para cargar extensiones sin firma.
; CSXS.9–12 cubre Premiere CC 2019 → 2025+.
Root: HKCU; Subkey: "Software\Adobe\CSXS.9";  ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Adobe\CSXS.10"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Adobe\CSXS.11"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Adobe\CSXS.12"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: uninsdeletevalue

[UninstallDelete]
Type: filesandordirs; Name: "{app}\{#BundleId}"

[Run]
; Solo aparece si falta alguna herramienta. Instala con winget en una
; consola visible para que el usuario vea el progreso.
Filename: "{cmd}"; \
    Parameters: "{code:WingetInstallCmd}"; \
    Description: "Instalar herramientas faltantes con winget"; \
    Flags: postinstall shellexec unchecked skipifsilent; \
    Check: AnyToolMissing

[Code]
var
    HasYt, HasFf, HasNode: Boolean;
    ToolsPage: TWizardPage;
    CurY: Integer;

{ Busca un ejecutable en el PATH (where.exe cubre scoop/winget/etc.) }
function InPath(ExeName: string): Boolean;
var Code: Integer;
begin
    Result := Exec('cmd.exe', '/C where ' + ExeName + ' >NUL 2>NUL',
                   '', SW_HIDE, ewWaitUntilTerminated, Code) and (Code = 0);
end;

function AnyToolMissing(): Boolean;
begin
    Result := not (HasYt and HasFf and HasNode);
end;

function WingetInstallCmd(Param: string): string;
var S: string;
begin
    S := '/K ';
    if not HasYt then
        S := S + 'winget install yt-dlp.yt-dlp -e --accept-source-agreements --accept-package-agreements & ';
    if not HasFf then
        S := S + 'winget install Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements & ';
    if not HasNode then
        S := S + 'winget install OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements & ';
    Result := S + 'echo. & echo Listo. Reinicia el panel si lo tenias abierto. & pause';
end;

procedure ToolLine(Name, Hint: string; Found, Required: Boolean);
var T: TNewStaticText;
begin
    T := TNewStaticText.Create(ToolsPage);
    T.Parent := ToolsPage.Surface;
    T.Left := 0;
    T.Top := CurY;
    T.Font.Size := 9;
    if Found then begin
        T.Caption := '    ' + Name + ' — instalado';
        T.Font.Color := $0059C735;
    end else begin
        T.Caption := '    ' + Name + ' — NO encontrado   (' + Hint + ')';
        T.Font.Color := $004B53E5;
    end;
    if not Required then T.Font.Style := [fsItalic];
    CurY := CurY + 20;
end;

procedure InitializeWizard();
var Lbl: TNewStaticText;
begin
    HasYt   := InPath('yt-dlp.exe');
    HasFf   := InPath('ffmpeg.exe');
    HasNode := InPath('node.exe');

    ToolsPage := CreateCustomPage(wpSelectDir,
        'Herramientas necesarias',
        'El panel usa estos programas (deben estar en el PATH):');

    Lbl := TNewStaticText.Create(ToolsPage);
    Lbl.Parent := ToolsPage.Surface;
    Lbl.Caption := 'Deteccion en este equipo:';
    Lbl.Top := 0;
    Lbl.Left := 0;

    CurY := 24;
    ToolLine('yt-dlp   (descargas)',                    'winget install yt-dlp.yt-dlp',    HasYt,   True);
    ToolLine('ffmpeg   (audio, merge y transcode)',      'winget install Gyan.FFmpeg',      HasFf,   True);
    ToolLine('Node.js  (recomendado: formatos YouTube)', 'winget install OpenJS.NodeJS.LTS', HasNode, False);

    Lbl := TNewStaticText.Create(ToolsPage);
    Lbl.Parent := ToolsPage.Surface;
    Lbl.Left := 0;
    Lbl.Top := CurY + 10;
    Lbl.Width := ToolsPage.SurfaceWidth;
    Lbl.Height := 70;
    Lbl.WordWrap := True;
    if AnyToolMissing() then
        Lbl.Caption :=
            'Puedes continuar de todas formas: al finalizar se ofrecera ' +
            'instalar las faltantes automaticamente con winget. ' +
            'yt-dlp y ffmpeg son obligatorios; Node.js es recomendado ' +
            '(sin el, yt-dlp no encuentra algunos formatos de YouTube).'
    else
        Lbl.Caption := 'Todas las herramientas estan disponibles. Puedes continuar.';
end;
