/**
 * Flickr search - a TinyMCE flickr image search and place plugin
 * flickr/js/flickr.js
 *
 * This is not free software
 *
 * Plugin info: http://www.cfconsultancy.nl/
 * Author: Ceasar Feijen
 *
 * Version: 1.2 released 29/04/2019
 */
tinymce.PluginManager.add('flickr', function(editor) {

    function openmanager() {

		if (tinymce.majorVersion > 4) {

        var title="Choose Flickr image";
        if (typeof editor.settings.flickr_title !== "undefined" && editor.settings.flickr_title) {
            title=editor.settings.flickr_title;
        }
        tinymce.activeEditor.windowManager.openUrl({
            title: title,
            url: tinyMCE.baseURL + '/plugins/flickr/flickr.html',
            filetype: 'image',
	    	width: 785,
            height: 540,
            inline: 1
        });

		} else {

        var title="Choose Flickr image";
        if (typeof editor.settings.flickr_title !== "undefined" && editor.settings.flickr_title) {
            title=editor.settings.flickr_title;
        }
        tinymce.activeEditor.windowManager.open({
            title: title,
            file: tinyMCE.baseURL + '/plugins/flickr/flickr.html',
            filetype: 'image',
	    	width: 785,
            height: 460,
            inline: 1
        });

		}

    }

	if (tinymce.majorVersion > 4) {

	editor.ui.registry.addButton('flickr', {
		text: 'Flickr',
		tooltip: 'Insert/edit Flickr image',
		shortcut: 'Ctrl+L',
		onAction: openmanager
	});

	editor.addShortcut('Ctrl+L', '', openmanager);

	editor.ui.registry.addMenuItem('flickr', {
		text: 'Insert Flickr image',
		shortcut: 'Ctrl+L',
		onAction: openmanager,
		context: 'insert'
	});

	} else {

	editor.addButton('flickr', {
		icon: true,
		image: tinyMCE.baseURL + '/plugins/flickr/icon.png',
		tooltip: 'Insert/edit Flickr image',
		shortcut: 'Ctrl+L',
		onclick: openmanager
	});

	editor.addShortcut('Ctrl+L', '', openmanager);

	editor.addMenuItem('flickr', {
		icon:'media',
		text: 'Insert Flickr image',
		shortcut: 'Ctrl+L',
		onclick: openmanager,
		context: 'insert'
	});

	}
});
