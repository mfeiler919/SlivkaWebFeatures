var slivkans, nicknames;

jQuery(document).ready(function(){
    //nav
    $('.nav li').eq(2).addClass('active');

    $.getJSON("ajax/getSlivkans.php",function(data){
        slivkans = data.slivkans;
        nicknames = data.nicknames;

        $('#filled-by').typeahead({source: slivkans.full_name.concat(nicknames.nickname)});
    });

    $.getJSON("ajax/getEvents.php",function(data){
        event_name = data.event_name;

        for(var i=0; i<event_name.length; i++){
            $('<option></option>').text(event_name[i]).appendTo('#event-name');
        }
    });
});

function validatePointsCorrectionForm(){
    var valid = true,
    errors = [];

    if(!validateFilledBy()){ valid = false; errors.push("Your Name"); }
    if($('#event-name').val() == 'Select One'){ valid = false; errors.push("Event Name"); }

    if(valid){
        submitPointsCorrection();
    }else{
        $("#submit-error").text("Validation errors in: "+errors.join(", ")).fadeIn();
    }
}

function validateFilledBy(){
    var valid, name = $('#filled-by').val();

    if (nicknames.nickname.indexOf(name) != -1){
        name = nicknames.aka[nicknames.nickname.indexOf(name)];
        $('#filled-by').val(name);
    }

    $('.filled-by-control').removeClass("warning");

    if(name.length > 0){
        valid = slivkans.full_name.indexOf(name) != -1;
        updateValidity($('.filled-by-control'),valid);
    }else{
        $('.filled-by-control').removeClass('error');
    }

    return valid;
}

function updateValidity(element,valid){
    if (valid){
        element.addClass("success").removeClass("error");
    }else{
        element.removeClass("success").addClass("error");
    }
}

function resetForm(){
    $("#filled-by").val(""); $('.filled-by-control').removeClass("success").removeClass("error");
    $("#event-name").val("Select One");
    $("#comments").val("");
    $("#submit-error").fadeOut();
}

function submitPointsCorrection(){
    var data = {
        event_name: $('#event-name').val(),
        name: $('#filled-by').val(),
        sender_email: slivkans.nu_email[slivkans.full_name.indexOf($('#filled-by').val())],
        comments: $('#comments').val()
    };
    $('#response').fadeOut();

    $.getJSON('./ajax/sendPointsCorrection.php',data,function(response){
        console.log(response);
        $('#response').html("<p>Response: "+response.message+"</p>");
        $('<a href="table.php" class="btn btn-primary">View Points</a>').appendTo('#response');
        $('<a class="btn" href="correction.php">Submit Another</a>').appendTo('#response');
        $('#response').fadeIn();
    });
}