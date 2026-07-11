(function($){
    wp.customize('ahenk_renk_ana',function(v){v.bind(function(c){document.documentElement.style.setProperty('--renk-ana',c);});});
    wp.customize('ahenk_renk_navbar',function(v){v.bind(function(c){document.documentElement.style.setProperty('--renk-navbar',c);});});
    wp.customize('ahenk_renk_ustbar',function(v){v.bind(function(c){document.documentElement.style.setProperty('--renk-ustbar',c);});});
})(jQuery);
