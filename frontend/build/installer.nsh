!macro customInstall
  ; Create POS Backups directory
  CreateDirectory "$INSTDIR\POSBackups"
  
  ; Set database file permissions
  SetFileAttributes "$INSTDIR\database.db" NORMAL
  
  ; Create desktop shortcut
  CreateShortCut "$DESKTOP\VOXO POS System.lnk" "$INSTDIR\frontend.exe" "" "$INSTDIR\resources\app.asar" 0
  
  ; Create start menu entry
  CreateDirectory "$SMPROGRAMS\VOXO Solutions"
  CreateShortCut "$SMPROGRAMS\VOXO Solutions\VOXO POS System.lnk" "$INSTDIR\frontend.exe" "" "$INSTDIR\resources\app.asar" 0
  CreateShortCut "$SMPROGRAMS\VOXO Solutions\Uninstall VOXO POS System.lnk" "$INSTDIR\Uninstall.exe" "" "$INSTDIR\Uninstall.exe" 0
!macroend

!macro customUnInstall
  ; Remove shortcuts
  Delete "$DESKTOP\VOXO POS System.lnk"
  Delete "$SMPROGRAMS\VOXO Solutions\VOXO POS System.lnk"
  Delete "$SMPROGRAMS\VOXO Solutions\Uninstall VOXO POS System.lnk"
  RMDir "$SMPROGRAMS\VOXO Solutions"
!macroend

