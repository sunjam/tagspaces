/* Copyright (c) 2012 The Tagspaces Authors. All rights reserved.
 * Use of this source code is governed by a AGPL3 license that 
 * can be found in the LICENSE file. */
//define(function(require, exports, module) {
//"use strict";
//    console.log(module.id);
//    console.log(module.uri);
    
console.debug("Loading FileViewer...");

var FileViewer = (typeof FileViewer == 'object' && FileViewer != null) ? FileViewer : {};

FileViewer.openFile = function(fileName) {
    console.debug("Opening file: "+fileName);

    var openedFilePath = UIAPI.currentPath+UIAPI.getDirSeparator()+fileName;
    // TODO replace \\ to \ in filenames
    openedFilePath.replace("\\\\","\\");
    $("#selectedFilePath").val(openedFilePath); 
    
    var fileExt = fileName.substring(fileName.lastIndexOf(".")+1,fileName.length).toLowerCase();
    var filePath = UIAPI.currentPath+UIAPI.getDirSeparator()+fileName;

    this.constructFileViewerUI(fileName, filePath);         

    // Getting the viewer for the file extension/type
    var viewerExt = TSSETTINGS.getFileTypeViewer(fileExt);  
    console.debug("File Viewer: "+viewerExt);

    // TODO Consider page width by opening, e.g. responsive design
    UIAPI.layoutContainer.open("east");    
    // UIAPI.layoutContainer.close("west");

    UIAPI.isFileOpened = true;

    $( "#viewer" ).empty();
    if(!viewerExt) {
        $( "#viewer" ).text("File type not supported for viewing.");        
        return;
    } else {
        require(["ext/"+viewerExt+"/extension"], function(viewer) {
            tsEditor = viewer;
            tsEditor.init(filePath, "viewer");
            tsEditor.viewerMode(true);
        });
    }  
} 

var tsEditor = undefined;

FileViewer.updateEditorContent = function(fileContent) {
    console.debug("Updating editor"); // with data: "+fileContent); 
    tsEditor.setContent(fileContent);    
}

FileViewer.editFile = function(fileName) {
    console.debug("Editing file: "+fileName);
    var filePath = UIAPI.currentPath+UIAPI.getDirSeparator()+fileName;
    var fileExt = fileName.substring(fileName.lastIndexOf(".")+1,fileName.length).toLowerCase();

    // Getting the editor for the file extension/type
    var editorExt = TSSETTINGS.getFileTypeEditor(fileExt);  
    console.debug("File Editor: "+editorExt);

    $( "#viewer" ).empty();
    if(!editorExt) {
        $( "#viewer" ).text("File type not supported for editing.");        
        return;
    } else {
        require(["ext/"+editorExt+"/extension"], function(editr) {
            tsEditor = editr;
            tsEditor.init(filePath, "viewer");
        });
    }   
} 

FileViewer.saveFile = function(fileName) {
    console.debug("Save current file: "+fileName);
    var content = tsEditor.getContent();
    var filePath = UIAPI.currentPath+UIAPI.getDirSeparator()+fileName;
    IOAPI.saveTextFile(filePath, content);    	
}

FileViewer.constructFileViewerUI = function(fileName, filePath) {
    // Adding tag buttons to the filetoolbox
    var tags = TSAPI.extractTags(fileName);

    $( "#fileTitle" ).text(TSAPI.extractTitle(fileName));
    
    // Generate tag buttons
    $( "#fileTags" ).empty();
    for (var i=0; i < tags.length; i++) {
        $( "#fileTags" ).append($("<button>", { 
            class: "tagButton", 
            tag: tags[i], 
            filename: fileName, 
            title: "Opens context menu for "+tags[i],
            text: tags[i] 
            }));            
    };

    // Activate tagButtons in file view
    $('.tagButton', $( "#fileTags" )).click( function() {
        TagsUI.openTagMenu(this, $(this).attr("tag"), $(this).attr("filename"));
    }); 
    
    // Clear filetoolbox
    $( "#filetoolbox" ).empty();

    // TODO Fullscreen disabled due a fullscreen issue
    //this.addFullScreenButton("#filetoolbox");

    this.addEditButton("#filetoolbox", fileName);

    this.addOpenInWindowButton("#filetoolbox", filePath);

    // TODO Tag suggestion disabled due menu init issue
    this.initTagSuggestionMenu(fileName, tags);
    this.addTagSuggestionButton("#filetoolbox");

    this.addCloseButton("#filetoolbox");     
}


FileViewer.initTagSuggestionMenu = function(fileName, tags) {
    // Adding buttons for creating tags according to the suggested tags
    var suggTags = TSAPI.suggestTags(fileName);

 //   $( "#tagSuggestionsMenu" ).menu();
 //   $( "#tagSuggestionsMenu" ).menu("disable");
    var tsMenu = $( "#tagSuggestionsMenu" );
    tsMenu.empty(); 
    
    for (var i=0; i < suggTags.length; i++) {        
        // Ignoring the tags already assigned to a file
        if(tags.indexOf(suggTags[i]) < 0) {
            tsMenu.append($('<li>', { 
                name: suggTags[i], 
                title: "Add tag "+suggTags[i]+" to current file", 
                text: "Tag with "+suggTags[i] 
                }));               
        }         
    };
    
    // TODO menu does not initialize
    tsMenu.menu({ // menu("destroy").
        select: function( event, ui ) {
            var tagName = ui.item.attr( "name" );    
            TSAPI.writeTagsToFile(fileName, [tagName]);
            IOAPI.listDirectory(UIAPI.currentPath);  
        }         
    });  
}

FileViewer.addEditButton = function(container, fileName) {
    // TODO implement disabled check
    var buttonDisabled = false;
	var options;
    $( ""+container ).append('<button id="editDocument">Edit</button>');
    $( "#editDocument" ).button({
        text: true,        
        icons: {
            primary: "ui-icon-wrench"
        },
        disabled: buttonDisabled
    })
    .click(function() {
		if ( $( this ).text() === "Edit" ) {
			options = {
				label: "Save",
				icons: {
					primary: "ui-icon-disk"
				}
			};
        	FileViewer.editFile(fileName);
		} else {
			options = {
				label: "Edit",
				icons: {
					primary: "ui-icon-wrench"
				}
			};
			FileViewer.saveFile(fileName);
			FileViewer.openFile(fileName);
		}
		$( this ).button( "option", options );    	
    });        
}

FileViewer.addOpenInWindowButton = function(container, filePath) {
    $( ""+container ).append('<button id="openInNewWindow">Open in new tab</button>');
    $( "#openInNewWindow" ).button({
        text: false,        
        icons: {
            primary: "ui-icon-newwin"
        },
        disabled: false
    })
    .click(function() {
        window.open("file:///"+filePath);
    });        
}

FileViewer.addCloseButton = function(container) {
    $( ""+container ).append('<button id="closeOpenedFile">Close</button>');
    $( "#closeOpenedFile" ).button({
        text: false,        
        icons: {
            primary: "ui-icon-circle-close"
        },
        disabled: false
    })
    .click(function() {
    	// Cleaning the viewer/editor
	    document.getElementById("viewer").innerHTML = "";
        UIAPI.isFileOpened = false;
        UIAPI.layoutContainer.open("west");    
        UIAPI.layoutContainer.close("east");
    });    
}


FileViewer.addFullScreenButton = function(container) {
    $( ""+container ).append('<button id="startFullscreen">Fullscreen</button>');
    $( "#startFullscreen" ).button({
        text: false,        
        icons: {
            primary: "ui-icon-arrow-4-diag"
        },
        disabled: false
    })
    .click(function() {
        var docElm = $("#container");
        docElm.mozRequestFullScreen();
/*        alert(docElm.webkitRequestFullScreen);
        if (docElm.requestFullscreen) {
            docElm.requestFullscreen();
        }
        else if (docElm.mozRequestFullScreen) {
            docElm.mozRequestFullScreen();
        }
        else if (docElm.webkitRequestFullScreen) {
        alert(docElm);
            docElm.webkitRequestFullScreen();
        }*/
    });    
}

FileViewer.addTagSuggestionButton = function(container) {
    $( ""+container ).append('<button id="openTagSuggestionMenu">Tag Suggestion</button>');
    $( "#openTagSuggestionMenu" ).button({
        text: false,        
        icons: {
            primary: "ui-icon-suitcase"
        },
        disabled: false
    })
    .click(function() {
        UIAPI.selectedTag = this.id;
        var menu = $("#tagSuggestionsMenu").show().position({
            my: "left top",
            at: "left bottom",
            of: $( this )
        });
        $( document ).one( "click", function() {
           menu.hide();
        });
        return false;
    });    
}
  
//});