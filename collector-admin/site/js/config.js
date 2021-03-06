/*
 * IVXV Internet voting framework
 *
 * Administrator interface - Configuration status page
 */

/**
 * Load page data
 */
function loadPageData() {
  var loadDate = new Date();
  loadDate.setTime(Date.now());

  // load collector state
  $.getJSON('data/status.json', function(state) {
      display_cfg_panel(
        'trust', state, state['config']['trust'], 'Usaldusjuure seadistus');
      display_cfg_panel(
        'technical', state, state['config-apply']['technical'], 'Tehniline seadistus');
      display_cfg_panel(
        'election', state, state['config-apply']['election'], 'Valimiste seadistus');
      display_cfg_panel(
        'choices', state, state['config-apply']['choices'], 'Valikute nimekiri');
      display_cfg_panel(
        'districts', state, state['list']['districts'], 'Ringkondade nimekiri');
      var list_no;
      display_cfg_panel(
        'voters01', state, state['config-apply']['voters01'], 'Valijate nimekiri (algne)');
      for (list_no = 2; list_no < 13; list_no++) {
        var list_id = 'voters' + (list_no < 10 ? '0' : '') + list_no;
        if (state['config-apply'][list_id] === undefined)
          break;
        display_cfg_panel(
          list_id, state, state['config-apply'][list_id],
          'Valijate nimekirja parandus nr. ' + (list_no - 1));
      }

      hideErrorMessage();

      // data loading stats
      var genDate = new Date();
      genDate.setTime(Date.parse(state['meta']['time_generated']));
      $('#loadstatus')
        .removeClass('text-danger')
        .addClass('text-info')
        .html(
          'Andmete laadimise aeg: ' + formatTime(loadDate, 0) + '<br />' +
          'Andmete genereerimise aeg: ' + genDate.toLocaleTimeString('et-EE', {}));
    })
    .fail(function() {
      $('#loadstatus')
        .removeClass('text-info')
        .addClass('text-danger')
        .html('Viga andmete laadimisel: ' + formatTime(loadDate, 0));
      showErrorMessage('Viga seisundi laadimisel', true);
    });
}

var state_filenames = {};

/**
 * Display config state panel
 */
function display_cfg_panel(id_prefix, state, cfg, title) {
  // Create panel if required
  var panel = $('#' + id_prefix + '-cfg-state-panel');
  if (!panel.length) {
    $('#upload-row').before(
      '<div class="row">' +
      '    <div class="col-lg-12">' +
      '        <div id="' + id_prefix + '-cfg-state-panel" class="panel">' +
      '            <div class="panel-heading">' +
      '                <h4 class="panel-title">' + title + '</h4>' +
      '            </div>' +
      '            <div class="panel-body">' +
      '              <div />' + // Placeholder for config info text
      '              <button type="button" class="btn btn-default" onClick="toggle_apply_log(this);">Rakendamise logi</button>' +
      '              <pre style="display: none;" class="pre-scrollable" />' + // Placeholder for log content
      '            </div>' +
      '        </div>' +
      '    </div>' +
      '</div>'
    );
    panel = $('#' + id_prefix + '-cfg-state-panel');
  }

  // Configure panel
  var panel_body = panel.find('.panel-body');
  panel
    .removeClass('panel-green')
    .removeClass('panel-warning')
    .removeClass('panel-danger');
  if ((id_prefix === 'trust') || (id_prefix === 'districts')) {
    var ver_element_id = 'cfg-ver-' + id_prefix;
    panel.addClass(cfg === null ? 'panel-danger' : 'panel-green');
    panel_body
      .find('div:first')
      .html(
        '<div>Seisund: ' + (cfg === null ? 'Laadimata' : 'Rakendatud haldusteenusele') + '</div>' +
        '<div>' +
        (cfg === null ? '-' : 'Versioon: <span id="' + ver_element_id + '"></span>') +
        '</div>');
    outputCmdVersion('#' + ver_element_id, id_prefix, state)
    panel_body.find('button').hide();
  } else if (cfg === undefined) {
    panel.addClass('panel-danger');
    panel_body.find('div:first').html('<div>Laadimata</div>');
    panel_body.find('button').hide();
  } else {
    state_filenames[id_prefix] = cfg['state_file'];
    if (cfg['completed']) {
      panel.addClass('panel-green');
    } else {
      panel.addClass('panel-warning');
    }

    panel_body
      .find('div:first')
      .html(
        '<div>Seisund: ' + (cfg['completed'] ? 'rakendatud' : 'rakendamisel') + '</div>' +
        '<div>Rakendatav versioon: <span id="cfg-ver-' + id_prefix + '">' + cfg['version'] + '</a></div>' +
        '<div>Rakendamise katseid: ' + cfg['attempts'] + '</div>'
      );
    outputCmdVersion('#cfg-ver-' + id_prefix, id_prefix, state)

    if (cfg['attempts']) {
      panel_body.find('button').show('slow');
      var logbox = panel_body.find('pre');
      if (logbox.is(':visible')) {
        refresh_log(logbox, cfg['state_file']);
      }
    } else {
      panel_body.find('button').hide('slow');
      panel_body.find('pre').hide('slow');
    }
  }
}

/**
 * Toggle config log box
 */
function toggle_apply_log(toggle_button) {
  var parent_element = $(toggle_button).parent();
  var logbox = parent_element.find('pre');
  logbox.toggle();
  if (logbox.is(':visible')) {
    var cfg_type = parent_element.parent().attr('id').replace('-cfg-state-panel', '');
    refresh_log(logbox, state_filenames[cfg_type]);
  }
}


/**
 * Refresh logbox content
 */
function refresh_log(logbox, filename) {
  var url = '/ivxv/data/commands/' + filename;
  $.getJSON(url, function(state) {
      logbox.text(state['log'][state['attempts'] - 1].join('\n'));
    })
    .fail(function(response) {
      logbox.text(response.responseText);
    });
}

/**
 * Reset upload form
 */
function reset_upload_form() {
  $('input[type=file]').val(null);
  $('#file-upload-submit').attr('disabled', '');
}

// Variable to store uploaded files
var files;

/**
 * Grab the files and set them to our variable
 */
function prepareUpload(event) {
  files = event.target.files;
  $('#file-upload-submit').attr('disabled', null);
  $('#upload-message').hide();
}

/**
 * Catch the form submit and upload the files
 */
function uploadFiles(event) {
  $('#upload-message')
    .removeClass('alert-danger')
    .removeClass('alert-success')
    .hide();

  event.stopPropagation(); // Stop stuff happening
  event.preventDefault(); // Totally stop stuff happening
  // Create a formdata object and add the files
  var data = new FormData();
  data.append('upload', files[0]);
  data.append('type', $('#drop').find(':selected').val());

  var form = $('#config-upload-form');
  $.ajax({
    url: form.attr('action'),
    type: form.attr('method'),
    data: data,
    cache: false,
    dataType: 'json',
    processData: false, // Don't process the files
    contentType: false, // Set content type to false as jQuery will tell the server its a query string request

    // Success
    success: function(data, textStatus, jqXHR) {
      console.log(jqXHR.responseJSON.message);
      $('#upload-message')
        .html(
          jqXHR.responseJSON.message +
          '<hr />' +
          '<pre>' + jqXHR.responseJSON.log.join('\n') + '</pre>'
        )
        .addClass(jqXHR.responseJSON.success ? 'alert-success' : 'alert-danger')
        .show();
      reset_upload_form();
    },

    // Handle errors
    error: function(jqXHR, textStatus, errorThrown) {
      console.log(jqXHR);
      $('#upload-message')
        .html(jqXHR.responseText)
        .addClass('alert-danger')
        .show();
    }
  });
}
