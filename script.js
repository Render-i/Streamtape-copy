// Function to log messages to the output div
function logMessage(message, type = 'info') {
    const outputDiv = document.getElementById("output");
    const messageElement = document.createElement('div');
    messageElement.className = `status-${type}`;
    messageElement.innerHTML = message;
    outputDiv.appendChild(messageElement);
    outputDiv.scrollTop = outputDiv.scrollHeight;
}

// Function to list contents of a destination folder
async function listDestContents(destLogin, destApiKey, folderId) {
    const url = `https://api.streamtape.com/file/listfolder?login=${destLogin}&key=${destApiKey}&folder=${folderId}`;
    const response = await fetch(url);
    if (response.ok) {
        const data = await response.json();
        if (data.status === 200) {
            const files = data.result.files || [];
            const folders = data.result.folders || [];
            return { files, folders };
        }
    }
    return { files: [], folders: [] };
}

// Function to create a folder in the destination account
async function createFolder(destLogin, destApiKey, folderName, parentFolderId) {
    const url = `https://api.streamtape.com/file/createfolder?login=${destLogin}&key=${destApiKey}&name=${folderName}&pid=${parentFolderId}`;
    const response = await fetch(url);
    if (response.ok) {
        const data = await response.json();
        if (data.status === 200) {
            return data.result.folderid;
        } else {
            logMessage(`Error creating folder '${folderName}': ${data.msg}`, 'error');
        }
    }
    logMessage(`Failed to create folder '${folderName}'.`, 'error');
    return null;
}

// Function to add remote upload in the destination account
async function addRemoteUpload(destLogin, destApiKey, fileUrl, destFolderId) {
    const url = `https://api.streamtape.com/remotedl/add?login=${destLogin}&key=${destApiKey}&url=${fileUrl}&folder=${destFolderId}`;
    const response = await fetch(url);
    if (response.ok) {
        const data = await response.json();
        if (data.status === 200) {
            return true;
        } else {
            logMessage(`Error adding remote upload for file: ${data.msg}`, 'error');
        }
    }
    logMessage("Failed to add remote upload.", 'error');
    return false;
}

// Recursive function to copy files and folders
async function copyFilesAndFolders(srcLogin, srcApiKey, destLogin, destApiKey, srcFolderId, destFolderId) {
    const url = `https://api.streamtape.com/file/listfolder?login=${srcLogin}&key=${srcApiKey}&folder=${srcFolderId}`;
    const response = await fetch(url);
    if (response.ok) {
        const data = await response.json();
        if (data.status === 200) {
            const folders = data.result.folders || [];
            const files = data.result.files || [];

            const { files: existingFiles, folders: existingFolders } = await listDestContents(destLogin, destApiKey, destFolderId);

            // Copy files
            for (const file of files) {
                const fileName = file.name;
                const fileUrl = file.link;
                if (existingFiles.some(f => f.name === fileName)) {
                    logMessage(`File '${fileName}' already exists in destination. Skipping.`, 'warning');
                } else {
                    logMessage(`Copying file: ${fileName}`, 'info');
                    const success = await addRemoteUpload(destLogin, destApiKey, fileUrl, destFolderId);
                    if (success) {
                        logMessage(`Successfully copied file: ${fileName}`, 'success');
                    }
                }
            }

            // Copy subfolders
            for (const folder of folders) {
                const folderName = folder.name;
                let destSubfolderId = existingFolders.find(f => f.name === folderName)?.id;
                if (!destSubfolderId) {
                    logMessage(`Creating folder: ${folderName}`, 'info');
                    destSubfolderId = await createFolder(destLogin, destApiKey, folderName, destFolderId);
                }
                if (destSubfolderId) {
                    await copyFilesAndFolders(srcLogin, srcApiKey, destLogin, destApiKey, folder.id, destSubfolderId);
                }
            }
        } else {
            logMessage(`Error listing folder: ${data.msg}`, 'error');
        }
    } else {
        logMessage(`Failed to retrieve data. HTTP Status code: ${response.status}`, 'error');
    }
}

// Function to start the copy process
function startCopyProcess() {
    const sourceLogin = document.getElementById("sourceLogin").value;
    const sourceApiKey = document.getElementById("sourceApiKey").value;
    const sourceFolderId = document.getElementById("sourceFolderId").value;
    const destLogin = document.getElementById("destLogin").value;
    const destApiKey = document.getElementById("destApiKey").value;
    const destRootFolderId = document.getElementById("destRootFolderId").value;

    // Clear previous output
    document.getElementById("output").innerHTML = "";
    logMessage("Starting the copy process...", 'info');

    copyFilesAndFolders(sourceLogin, sourceApiKey, destLogin, destApiKey, sourceFolderId, destRootFolderId);
}
