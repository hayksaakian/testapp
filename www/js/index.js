//TODO: bookmarks
//better search:
//keywords instead of literal
//OR support

//PRO Tips:
//after typing your terms, push tab, then space to quickly start your search

/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
    initialize: function() {
        this.bind();
        console.log("initialize bound");
    },
    bind: function() {
        // document.addEventListener('deviceready', this.deviceready, false);
        // console.log("listener bound");
        var ms = navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/);
        var ua = navigator.userAgent.toString();
        if (ms != null) {
            $("#status").text("mobile: "+ua+" user agent is mobile, we are in PhoneGap");
            document.addEventListener('deviceready', this.deviceready, false);
        } else {
            $("#status").text("pc: "+ua+" user agent did not match, assuming PC, we are in Chrome App");
            this.deviceready();
        }
        console.log("listener bound");
        console.log("user agent is: "+ua);
    },
    deviceready: function() {
        // This is an event handler function, which means the scope is the event.
        // So, we must explicitly called `app.report()` instead of `this.report()`.
        $("#status").text("");
        app.report('deviceready');
    },
    report: function(id) {
        // Report the event in the console
        console.log("Report: " + id);

        // Toggle the state from "pending" to "complete" for the reported ID.
        // Accomplished by adding .hide to the pending element and removing
        // .hide from the complete element.
        document.querySelector('#' + id + ' .pending').className += ' hide';
        var completeElem = document.querySelector('#' + id + ' .complete');
        completeElem.className = completeElem.className.split('hide').join('');
        //testing out lawnchair.js
        $(function(e) {
            var lawnchair = Lawnchair({name:'lawnchair'},function(e){
                console.log('storage open');            
                refresh_timestamp_view();
                refresh_total_article_count_view();
            });
            //this is slow as hell, i don't know why
            function refresh_total_article_count_view(){
                var t0 = Date.now();
                var dv = $("#total_article_count");
                dv.find('#txtv').hide();
                lawnchair.all(function(everything){
                    var l = everything.length.toString();
                    console.log(l+" items in db");
                    dv.find('#txtv').text(l+' articles.');
                    dv.find('#txtv').show();
                    console.log('count took this long:');
                    console.log(Date.now()-t0);
                });
            };
            function refresh_timestamp_view(){
                $("#last_update_time").text("checking age");
                lawnchair.get("timestamp",function(obj){
                    var tm = "... never updated";
                    if(obj != null){
                        var t = parseInt(obj.value["time"])*1000;
                        // console.log(t);
                        d = new Date(t);
                        tm = "Last updated on "+d.toLocaleDateString()+" at "+d.toLocaleTimeString();
                    }
                    $("#last_update_time").text(tm);
                });
            }
            // uncomment to clear the database
            //lawnchair.nuke();
            function inject_article(ui_container, json){
                $(ui_container).find('#body').text(json["body"]);
            }

            $('#reload_list').click(function(e){
                reload_list();
            });

            function initTimestamp(){
                //sets the time stamp to a year before now
                var d = new Date();
                d.setFullYear(d.getFullYear() - 1);
                obj = {};
                //validate that this would actually work
                obj["time"] = Math.round(d.valueOf() / 1000).toString();
                obj["cur_state"] = "FINISHED";
                lawnchair.save({key:"timestamp", value:obj});
                $('#get_from_server').click();
            }

            function latest_articles_path(timestamp_as_int){
                //GET url for articles newer than timestamp_as_int
                return "http://www.extempengine.com/articles/latest.json?order_by=asc&getnewer=true&limit=200&int_time="+timestamp_as_int//+"&callback=?";
            }

            function wrap_with_bs(url){
                if (url.indexOf("?") == -1) {
                    url = url + "&callback=?";
                } else {
                    url = url + "?callback=?";
                }
                return url;
            }
            function add_article_to_db(article_as_json){
                lawnchair.save({key:article_as_json["_id"],value:article_as_json});
            }
            function article_to_lc_entry(article_as_json){
                return {key:article_as_json["_id"],value:article_as_json};
            }
            $('#get_from_server').click(function(e) {
                update_articles();
            });
            function update_articles(){
                $(".progress").show();
                var pbar = $(".bar");
                pbar.width('5%');
                console.log("starting update process");
                var newer_than = "0";
                lawnchair.exists("timestamp", function(bl) {
                    // console.log("bad keys may be");
                    // console.log(thisobj);
                    // console.log(", just fyi.");
                    console.log(bl);
                    pbar.width('15%');
                    if (bl == false) {
                        initTimestamp();
                    } else {
                        lawnchair.get("timestamp", function(thisobj) {
                            pbar.width('25%');
                            var obj = {};
                            obj = thisobj.value;
                            // //validate that this would actually work
                            newer_than = parseInt(obj["time"]);
                            console.log(newer_than);
                            console.log(latest_articles_path(newer_than));
                            pbar.width('51%');
                            jQuery.getJSON(latest_articles_path(newer_than), function(jsondata){    
                                console.log("recieved data from server!");
                                console.log("callback data str length "+JSON.stringify(jsondata).length.toString());                    
                                var total = jsondata.length;
                                //format like:
                                var newest_date = newer_than.toString();
                                pbar.width('75%');
                                var t0 = Date.now();
                                $.each(jsondata, function(index, data) {
                                    //var article = data;
                                    console.log((25*(index/total)+75).toString()+'%');
                                    pbar.width((25*(index/total)+75).toString()+'%');
                                    add_article_to_db(data);
                                    if(index == total - 1){
                                        di = new Date(data["published_at"].toString());
                                        newest_date = Math.round(di.valueOf() / 1000).toString();
                                        update_timestamp(newest_date);
                                        tdelta = (Date.now() - t0).toString();
                                        console.log('saving took '+tdelta+' milliseconds');
                                    }
                                });
                                if(total <= 2){
                                    alert('server has no new articles!');
                                }else{
                                    refresh_total_article_count_view();
                                }
                                //add_article_to_db(data);
                                $(".progress").hide();
                            }); 
                        });
                    }
                });
            }
            function update_timestamp(str_time){
                lawnchair.get("timestamp",function(thisobj){
                    console.log(JSON.stringify(thisobj));
                    var obj = {};
                    obj = thisobj.value;
                    obj["time"] = str_time;
                    lawnchair.save({key:"timestamp",value:obj});
                    refresh_timestamp_view();
                });
            }
            $('#sort_by_match_count').click(function(e){
                derp("#match_count");
            });
            $('#sort_by_xrank').click(function(e){
                derp("#xrank");
            });
            $('#sort_by_date').click(function(e){
                derp("#pb_time");
            });
            function derp(critera_div_string_selector){
                var list = $('#article_list');
                var arr = $.makeArray(list.children(".well"));
                arr.sort(function(a, b) {
                    var textA = parseFloat($(a).find(critera_div_string_selector).text());
                    var textB = parseFloat($(b).find(critera_div_string_selector).text());    
                    if (textA > textB) return -1;
                    if (textA < textB) return 1;
                    return 0;
                });
                list.empty();
                $.each(arr, function() {
                    list.append(this);
                });
            }

            $('#search').click(function(e) {
                $(".progress").show();
                var pbar = $(".bar");
                pbar.width('5%');
                var search_term = $("#search_field").val();
                var search_type = $('#search_type').val(); 
                var re = new RegExp(search_term, "gi")
                console.log("startings search for "+search_term);
                pbar.parent().find('span').text('Searching for '+search_term);
                console.log("startings search for "+re.toString());
                var t0 = Date.now();
                lawnchair.all(function(articles){
                    $('#article_list').empty();
                    var total = articles.length;
                    console.log(total);
                    pbar.width('25%')
                    var counter = 0;
                    for(var i = 0; i<articles.length;i++)
                    {
                        //console.log(((75*i/total) + 25).toString()+'%');
                        pbar.width(((75*i/total) + 25).toString()+'%');
                        cur_a = articles[i].value;
                        if(cur_a["title"] != null){
                            var thing_to_search = "string";
                            if(search_type == "everything"){
                                thing_to_search = cur_a["title"]+" "+cur_a["body"]+" "+cur_a["summary"];
                            }else if(search_type == "title"){
                                thing_to_search = cur_a["title"];
                            }else if (search_type == "body"){
                                thing_to_search = cur_a["body"];
                            }
                            //for safety
                            thing_to_search = " "+thing_to_search;
                            var matches = thing_to_search.match(re);
                            if (matches != null) 
                            {
                                //count results in the body even though we're searching by title
                                //for the purposes of ranking
                                if(search_type == "title"){
                                    matches = (cur_a["title"]+" "+cur_a["body"]).match(re);
                                }
                                counter = counter + 1;
                                var lyo = make_article_layout();
                                lyo.find("#title").text(cur_a["title"]);
                                //xrank is the kw density
                                //let title be more important than body
                                var xrank = (1.0 * matches.length) / thing_to_search.length;
                                if(cur_a["title"] != null){
                                    var m2 = cur_a["title"].match(re);
                                    if(m2 != null){
                                        xrank = (xrank * m2.length)
                                    }
                                }
                                lyo.find("#match_count").text(matches.length.toString());
                                lyo.find("#xrank").text(xrank.toString());
                                console.log(cur_a["title"]);
                                //console.log(cur_a["body"]);
                                lyo.attr("id", "partial_"+cur_a["_id"]);
                                lyo.find(".rd").attr("id", "btn_"+cur_a["_id"]);
                                lyo.find(".rd").click(function(e){
                                    //this selected could be a lot nicer
                                    var the_id = $(this).attr("id").replace('btn_', '');
                                    console.log(the_id);
                                    var show_article_tab = $('#show_article_'+the_id);
                                    if(show_article_tab.length == 0){
                                        console.log("expanding");
                                        expand_article(the_id);
                                    }else{
                                        console.log("showing");
                                        show_article_tab.click();
                                    }
                                });
                                //lyo.find("#body").text(cur_a["body"]);
                                var d = new Date(cur_a["published_at"].toString());
                                lyo.find("#published_at").text(d.toDateString());
                                var pb_time = Math.round(d.valueOf() / 1000).toString();
                                lyo.find("#pb_time").text(pb_time);
                                lyo.find("#author").text(cur_a["author"]);
                                lyo.find("#source").text(" paper_id:"+cur_a["paper_id"]+" | "+cur_a["url"]);
                                //make the bookmark button do something
                                lyo.find('.bkmrk').click(bm_dne);
                                lyo.find('.bkmrk').attr('id', 'bkmrk_'+cur_a["_id"]);
                            }
                        }
                    }
                    $('#number_of_results').text(counter.toString());
                    $(".progress").hide();
                    derp("#match_count");
                    console.log('search took this long in ms:');
                    console.log(Date.now()-t0);
                });
            });
            function bm_dne(e){
                //the bookmark does not exist, create it
                var t_id = $(this).attr("id").replace("bkmrk_", "");
                var n = $('#bkmrk_'+t_id);
                n.click(bm_de);
                n.removeClass('btn-warning');
                n.addClass('btn-danger');
                create_bookmark(t_id);
            }
            function bm_de(e){
                //the bookmark does exist, remove it
                var t_id = $(this).attr("id").replace("bkmrk_", "");
                var n = $('#bkmrk_'+t_id);
                n.click(bm_dne);
                n.removeClass('btn-danger');
                n.addClass('btn-warning');
                remove_bookmark(t_id);
            }
            function make_article_layout(){
                var template = $("#article_template");
                var cont = $("#article_list");
                var n = template.contents().clone();
                n.appendTo(cont);
                n.show();
                return n;                
            }
            function expand_article(article_id){
                //create tab
                var articles_nav = $('#articles_nav');
                var nav_template = articles_nav.find("#show_article_ID");
                var n = nav_template.parent().clone();
                n.find('a').attr("id", "show_article_"+article_id)
                //add nav toggle-ability to the new nav button
                n.find('.shw').click(function(e){
                    var id = $(this).attr("id");
                    var vname = id.replace("show_", "");
                    vname = "#"+vname + "_view";
                    $(".vw").hide();
                    $(".shw").removeClass("active");
                    // $(".shw").find("span").hide();
                    $(this).addClass("active");
                    // $(this).find("span").show();
                    console.log(vname);
                    $('#articles_view').show();
                    $(vname).show();
                });
                n.appendTo(articles_nav);
                n.show();
                //create view //and then will also click on the tab
                open_article(article_id);
            }
            function open_article(article_id){
                //get the partial
                var template = $('#partial_'+article_id);
                console.log(template.length);
                console.log(template.find('#title').length);
                var s = template.find('#title').text();
                console.log(s);
                var tab_b = $('#show_article_'+article_id);
                tab_b.find('.txtv').text(' '+s.substring(0, 12)+'...');
                console.log(s.substring(0, 16));
                var cont = $("#articles_view");
                //build a view rfom the partial
                var n = template.clone();
                n.attr('id', 'article_'+article_id+'_view');
                n.find('.rd').parent().hide();
                n.find('.bck').parent().show();
                n.find('.cls').parent().show();
                n.find('.bck').click(function(e){
                    $('#show_search').click();
                });
                n.find('.cls').click(function(e){
                    //kill the tab
                    $('#show_article_'+article_id).parent().remove();
                    //kill the view
                    n.remove();
                });
                n.find('#body_well').show();
                n.appendTo(cont);
                //because doing the 'get' could take some time, display text
                n.find('#body_text').text('Loading article body...');
                lawnchair.get(article_id, function(obj){
                    var article_json = obj.value;
                    //actually assign all of the fields, lol
                    n.find('#body_text').text(article_json['body']);
                    //click on the tab to actually show everything
                });
                n.show();
                tab_b.click();
            }

            $("#clear_db").click(function(e){
                lawnchair.nuke();
                console.log('nuke dropped');
            });
            //view controls
            $(".shw").click(function(e){
                var id = $(this).attr("id");
                var vname = id.replace("show_", "");
                vname = "#"+vname + "_view";
                $(".vw").hide();
                $(".shw").removeClass("active");
                // $(".shw").find("span").hide();
                $(this).addClass("active");
                // $(this).find("span").show();
                $(vname).show();
            });
            //Bookmarks
            function add_bookmark(article_id){
                lawnchair.exists("bookmarks", function(bool){
                    if(bool){                
                        lawnchair.get("bookmarks", function(obj){
                            obj.push(article_id);
                            lawnchair.save({key:"bookmarks", value:obj});
                        });
                    }else{                
                        obj = [article_id];
                        lawnchair.save({key:"bookmarks", value:obj});
                    }
                    //create partial
                    create_bookmark(article_id);
                });
            }
            function create_bookmark(article_id){
                var template = $('#partial_'+article_id);
                console.log(template.length);
                //build a view rfom the partial
                var n = template.clone();
                n.attr('id', 'article_'+article_id+'_bookmark');
                n.find('.bck').parent().show();
                n.find('.bck').click(function(e){
                    $('#show_search').click();
                });
                n.show();
            }
            function remove_bookmark(article_id){
                lawnchair.exists("bookmarks", function(bool){
                    //bookmarks exist, proceed...
                    if(bool){                
                        lawnchair.get("bookmarks", function(obj){
                            var idx = obj.indexOf(article_id); // Find the index
                            if(idx != -1) {
                                obj.splice(idx, 1); // Remove it if really found!
                                lawnchair.save({key:"bookmarks", value:obj});
                            }else{
                                //this article_id is not bookmarked...
                            }
                        });
                    } else{
                        //there are no bookmarks bro
                    }
                });
            }

        }); // end lawnchair shit and jquery block
    } //done with report
}; //done defining app
