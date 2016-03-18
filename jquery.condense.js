/**
 * Condense 0.1 - Condense and expand text heavy elements
 *
 * (c) 2008 Joseph Sillitoe
 * Dual licensed under the MIT License (MIT-LICENSE) and GPL License,version 2 (GPL-LICENSE).
 */

/*
 * jQuery plugin
 *
 * usage:
 *
 *   $(document).ready(function(){
 *     $('#example1').condense();
 *   });
 *
 * Options:
 *  condensedLength: Target length of condensed element. Default: 200
 *  minTrail: Minimun length of the trailing text. Default: 20
 *  delim: Delimiter used for finding the break point. Default: " " - {space}
 *  moreText: Text used for the more control. Default: [more]
 *  lessText: Text used for the less control, or null/empty for no less control. Default: [less]
 *  ellipsis: Text added to condensed element. Default:  ( ... )
 *  animate: True iff expanding and condensing should be animated. Default: true
 *  moreSpeed: Animation Speed for expanding. Default: "normal"
 *  lessSpeed: Animation Speed for condensing. Default: "normal"
 *  easing: Easing algorith. Default: "linear"
 *  expandedWidth: Width of the expanded text (optional)
 */

(function($) {

    // plugin definition
    $.fn.condense = function(options) {

        var opts = $.extend({}, $.fn.condense.defaults, options); // build main options before element iteration

        $.metadata ? debug('metadata plugin detected', opts) : debug('metadata plugin not present', opts);//detect the metadata plugin?

        // iterate each matched element
        return this.each(function() {
            var $this = $(this);

            // support metadata plugin (v2.0)
            var o = $.metadata ? $.extend({}, opts, $this.metadata()) : opts; // build element specific options

            debug('Condensing ['+$this.text().length+']: '+$this.text(), opts);

            $this.wrap('<span class="condensedParent"></span>');
            var $par = $this.parent();

            var clone = cloneCondensed($this,o);

            if (clone){

                clone.addClass(o.condensedClass);
                $this.addClass(o.expandedClass);

                // id attribute switch.  make sure that the visible elem keeps the original id (if set).
                $this.attr('id') ? $this.attr('id','condensed_'+$this.attr('id')) : false;

                var controlMore = " <span class='condense_control condense_control_more' style='cursor:pointer;'>"+o.moreText+"</span>";
                if (o.inline) {
                    clone.append(controlMore);
                } else {
                    clone.append(o.ellipsis + controlMore);
                }

                $par.append(clone);
                if(o.lessText) {
                    var controlLess = " <span class='condense_control condense_control_less' style='cursor:pointer;'>"+o.lessText+"</span>";
                    $this.append(controlLess).hide();
                }


                $('.condense_control_more',clone).click(function(){
                    debug('moreControl clicked.', opts);
                    $par.trigger(o.moreEvent);
                });

                $('.condense_control_less',$this).click(function(){
                    debug('lessControl clicked.', opts);
                    $par.trigger(o.lessEvent);
                });

                var isExpanded = false;
                $par.bind(o.lessEvent, function() {
                    if(isExpanded) {
                        triggerCondense($par,o)
                        isExpanded = false;
                    }
                });
                $par.bind(o.moreEvent,   function() {
                    if(! isExpanded) {
                        triggerExpand($par,o)
                        isExpanded = true;
                    }
                });
            }
        });
    };

    function cloneCondensed(elem, opts){
        // Try to clone and condense the element.  if not possible because of the length/minTrail options, return false.
        // also, dont count tag declarations as part of the text length.
        // check the length of the text first, return false if too short.
        if ($.trim(elem.text()).length <= opts.condensedLength + opts.minTrail){
            debug('element too short: skipping.', opts);
            return false;
        }

        var fullbody = $.trim(elem.html());
        var fulltext = $.trim(elem.text());
        var delim = opts.delim;
        var clone = elem.clone();
        var delta = 0;

        do {
            // find the location of the next potential break-point.
            var loc = findDelimiterLocation(fullbody, opts.delim, (opts.condensedLength + delta));
            //set the html of the clone to the substring html of the original
            if (opts.inline) {
                clone.html(fullbody.substring(0,(loc+1)) + ' ' + opts.ellipsis);
            } else {
                clone.html(fullbody.substring(0, (loc + 1)));
            }
            var cloneTextLength = clone.text().length;
            var cloneHtmlLength = clone.html().length;
            delta = clone.html().length - cloneTextLength;
            debug ("condensing... [html-length:"+cloneHtmlLength+" text-length:"+cloneTextLength+" delta: "+delta+" break-point: "+loc+"]");
            //is the length of the clone text long enough?
        }while(delta && clone.text().length < opts.condensedLength );

        //  after skipping ahead to the delimiter, do we still have enough trailing text?
        if ((fulltext.length - cloneTextLength) < opts.minTrail){
            debug('not enough trailing text: skipping.', opts);
            return false;
        }

        debug('clone condensed. [text-length:'+cloneTextLength+']', opts);
        return clone;
    }


    function findDelimiterLocation(html, delim, startpos){
        // find the location inside the html of the delimiter, starting at the specified length.
        var foundDelim = false;
        var loc = startpos;
        do {
            var loc = html.indexOf(delim, loc);
            if (loc < 0){
                debug ("No delimiter found.");
                return html.length;
            } // if there is no delimiter found, just return the length of the entire html string.
            foundDelim = true;
            while (isInsideTag(html, loc)) {
                // if we are inside a tag, this delim doesn't count.  keep looking...
                loc++;
                foundDelim = false;
            }
        }while(!foundDelim);
        debug ("Delimiter found in html at: "+loc);
        return loc;
    }


    function isInsideTag(html, loc){
        var startTagIndex = html.indexOf('<', loc);
        var endTagIndex = html.indexOf('>', loc);
        return (startTagIndex === -1 && endTagIndex >0) || (endTagIndex < startTagIndex);
    }


    function getElements(par){
        var orig = par.children().first(); // The original element will be the first element in the parent
        var condensed = orig.next(); // The condensed element will be the original immediate next sibling.
        return {orig: orig, condensed: condensed};
    }

    function triggerCondense(par, opts){
        var elements = getElements(par);
        elements.condensed.show();
        var con_w  = elements.condensed.width();
        var con_h = elements.condensed.height();
        elements.condensed.hide(); //briefly flashed the condensed element so we can get the target width/height
        var orig_w  = elements.orig.width();
        var orig_h = elements.orig.height();
        if (opts.animate) {
            elements.orig.animate({height: con_h, width: con_w, opacity: 1}, opts.lessSpeed, opts.easing,
                function () {
                    elements.orig.height(orig_h).width(orig_w).hide();
                    elements.condensed.show();
                });
        }else{
             elements.orig.height(orig_h).width(orig_w).hide();
             elements.condensed.show();
        }
    }


    function triggerExpand(par, opts){
        var elements = getElements(par);
        elements.orig.show();
        var orig_w  = elements.orig.width();
        var orig_h = elements.orig.height();
        elements.orig.width(elements.condensed.width()+"px").height(elements.condensed.height()+"px");
        elements.condensed.hide();
        if (opts.animate) {
            elements.orig.animate({height: orig_h, width: orig_w, opacity: 1}, opts.moreSpeed, opts.easing);
        }else{
            elements.orig.height(orig_h).width(orig_w).show();
        }
        if(elements.condensed.attr('id')){
            var idAttr = elements.condensed.attr('id');
            elements.condensed.attr('id','condensed_'+idAttr);
            elements.orig.attr('id',idAttr);
            }
        }


        /**
         * private function for debugging
         */
        function debug(str, opts) {
            if (opts && opts.debug && window.console && window.console.log){window.console.log(str);}
        }


        // plugin defaults
        $.fn.condense.defaults = {
            condensedLength: 200,
            minTrail: 20,
            delim: " ",
            moreText: "[more]",
            lessText: "[less]",
            ellipsis: " ( ... )",
            inline: true,
            animate: true,
            moreSpeed: "normal",
            lessSpeed: "normal",
            easing: "linear",
            moreEvent: 'expand.condensePlugin',
            lessEvent: 'condense.condensePlugin',
            condensedClass: '',
            expandedClass:  '',
            eventProxy: undefined,
            debug: true
    };

})(jQuery);
