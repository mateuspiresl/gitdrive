# GitDrive

Git friendly backup application for Google Drive.

Backup your files to your Google Drive account like you manage your Git repositories.

#### Example

```sh
$ ls
file_mod_1.txt file_mod_2.txt file_new.txt file_ignore.txt
$ gitdrive status
Not staged:
  modified: file_mod_1.txt
  modified: file_mod_2.txt
Not monitored:
  file_add.txt
  file_ignore.txt
$ gitdrive add -u
$ gitdrive add file_add.txt
$ gitdrive status
Staged:
  modified: file_mod_1.txt
  modified: file_mod_2.txt
Not staged:
  new file: file_add.txt
Not monitored:
  file_ignore.txt
$ gitdrive push
Changes:
  2 files updated
  1 new file
```

## Developtment

This project is at an **early development stage**. All codes are in branch `dev`.