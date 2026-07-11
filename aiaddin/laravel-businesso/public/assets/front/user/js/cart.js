var pprice = 0.00;
toastr.options.closeButton = true;


function totalPrice(qty) {
    qty = qty.toString().length > 0 ? qty : 0;


    $voptions = $("input.voptions:checked");
    let vprice = 0;
    if ($voptions.length > 0) {
        $voptions.each(function () {
            vprice = parseFloat(vprice) + parseFloat($(this).data('price'));
        });
    }
    let total = parseFloat(pprice) + parseFloat(vprice);
    total = total.toFixed(2) * parseInt(qty);
    if ($("#productPrice").length > 0) {
        $("#productPrice").html(total.toFixed(2));
    }

    return total.toFixed(2);
}


function addToCart(url, variant, qty, product_price) {
    let cartUrl = url;
    $(".request-loader").show();
    // button disabled & loader activate (only for modal add to cart button)
    $(".modal-cart-link").addClass('disabled');
    $(".modal-cart-link span").removeClass('d-block');
    $(".modal-cart-link span").addClass('d-none');
    $(".modal-cart-link i").removeClass('d-none');
    $(".modal-cart-link i").addClass('d-inline-block');



    $.get(cartUrl + ',,,' + qty + ',,,' + totalPrice(qty) + ',,,' + JSON.stringify(variant) + ',,,' + product_price, function (res) {

        setTimeout(() => {
            $(".request-loader").hide();
        }, 500);

        // button enabled & loader deactivate (only for modal add to cart button)
        $(".modal-cart-link").removeClass('disabled');
        $(".modal-cart-link span").removeClass('d-none');
        $(".modal-cart-link span").addClass('d-block');
        $(".modal-cart-link i").removeClass('d-inline-block');
        $(".modal-cart-link i").addClass('d-none');

        if (res.message) {
            toastr["success"](res.message);
            $("#cartQuantity").load(location.href + " #cartQuantity");
            $("#variationModal").modal('hide');
            $("#cartIconWrapper").load(location.href + " #cartIconWrapper>*", "");
        } else {
            toastr["error"](res.error);
        }
    });
}


// wish list

function addTowishList(url, $this) {
    let addWishlistUlr = url;
    // button disabled & loader activate (only for modal add to cart button)
    $(".modal-cart-link").addClass('disabled');
    $(".modal-cart-link span").removeClass('d-block');
    $(".modal-cart-link span").addClass('d-none');
    $(".modal-cart-link i").removeClass('d-none');
    $(".modal-cart-link i").addClass('d-inline-block');
    $.get(addWishlistUlr, function (res) {
        setTimeout(() => {
            $(".request-loader").hide();
        }, 500);
        // button enabled & loader deactivate (only for modal add to cart button)
        $(".modal-cart-link").removeClass('disabled');
        $(".modal-cart-link span").removeClass('d-none');
        $(".modal-cart-link span").addClass('d-block');
        $(".modal-cart-link i").removeClass('d-inline-block');
        $(".modal-cart-link i").addClass('d-none');

        if (res.message == undefined) {
            toastr["error"](res.error);
        } else {
            toastr["success"](res.message);
            $("#wishlistIconWrapper").load(location.href + " #wishlistIconWrapper");
            if ($this.find('i').hasClass('far')) {
                $this.find('i').removeClass('far fa-heart').addClass('fa fa-heart')
            } else {
                $this.find('i').removeClass('fa fa-heart').addClass('far fa-heart')
            }
        }
    });
}

(function ($) {
    "use strict";
    // ============== add to cart js start =======================//
    $(document).on('click', '.cart-link', function (e) {

        e.preventDefault();
        let variations = $(this).data('variations');
        // set product current price
        pprice = $(this).data('current_price');

        let title = $(this).data('title');
        let item_id = $(this).data('item_id');
        let flash_percentage = $(this).data('flash_percentage');
        // clear all previously loaded variations  input radio & checkboxes 
        $(".variation-label").addClass("d-none");
        $("#variants").html("");
        // load variants  in modal if variations  available for this item
        if ((variations != null)) {
            $("#variationModal").modal('show');
            // set modal title & quantity
            $("#variationModal .modal-title > span").html(title);
            $("input[name='cart-amount']").val(1);
            $(".variation-label").removeClass("d-none");
            let variationLength = Object.keys(variations).length;
            // load variations radio button input fields

            let variants = ``;
            let iopt = 0;
            for (var key in variations) {
                let options_name = JSON.parse(variations[key].option_name)
                let options_price = JSON.parse(variations[key].option_price)
                let options_stock = JSON.parse(variations[key].option_stock)
                variants += `<div class="col-md-6">
                        <h6 class='mb-2'>${variations[key].variant_name}</h6>
                        <div class="form-group">`;
                for (let i = 0; i < options_name.length; i++) {
                    variants += `<input class="voptions" ${i == 0 ? 'checked' : ''} data-key="${i}" data-option="${variations[key].variant_name}" data-name="${options_name[i]}" data-price="${parseFloat(options_price[i] - (flash_percentage * options_price[i]) / 100).toFixed(2)}" data-stock="${options_stock[i]}" type="radio" id="${variations[key].id}${options_name[i]}" name="${variations[key].variant_name}"
                                    value="">
                                <label for="${variations[key].id}${options_name[i]}">${options_name[i]} + 
                                ${textPosition == 'left' ? currSymbol : ''}${parseFloat(options_price[i] - (flash_percentage * options_price[i]) / 100).toFixed(2)}${textPosition == 'right' ? currSymbol : ''} 
                                </label>  <br>`;
                }
                iopt++;
                variants += `</div>
                    </div>`;
            }
            $("#variants").html(variants);
            // set modal price
            totalPrice(1)
            $(".modal-cart-link").attr('data-item_id', item_id);
            $(".modal-cart-link").attr('data-product_price', pprice);
        } else {
            $(".request-loader").addClass("show");
            let $this = $(this);
            let url = $this.attr('data-href');
            let product_price = $this.attr('data-current_price');
            let qty = $("#detailsQuantity").length > 0 ? $("#detailsQuantity").val() : 1;
            addToCart(url, null, qty, product_price, "");
        }
    });
    // ============== add to cart js end ======================= //
    // ============== variation modal add to cart start =======================//
    $(document).on('click', '.modal-cart-link', function () {
        let $voptions = $("input.voptions:checked");
        let variant = {};
        let v_name = ''
        let v_op_name = ''
        let st = 0;
        let stErr = 0;
        let stErrMsg = [];
        if ($voptions.length > 0) {
            $voptions.each(function () {
                st = parseFloat($(this).data('stock'));
                v_op_name = $(this).data('name');
                v_name = $(this).data('option');
                let $input = $(".modal-quantity input");
                let currval = parseInt($input.val())
                let stock = parseFloat(st);
                if (stock < currval) {
                    stErrMsg.push(v_name + ' : ' + v_op_name + " ; stock unavailable");
                    stErr = 1;
                } else {
                    $input.val(currval);
                    variant[$(this).data('option')] = {
                        'name': $(this).data('name'),
                        'price': $(this).data('price')
                    };
                }
            });
        } else {
            toastr["error"]("Select A variation first");
        }
        if (stErr == 0) {
            let qty = $("input[name='cart-amount']").val();
            let pid = $(this).attr('data-item_id');
            let url = mainurl + "/add-to-cart/" + pid;
            variant = variant;
            let product_price = $(this).attr('data-product_price');
            addToCart(url, variant, qty, product_price);
        } else {
            stErrMsg.forEach(msg => {
                toastr["error"](msg);
            });
        }
    });
    // ============== variation modal add to cart end =======================//



    // ============== cart update js start ========================== //
    $(document).on('click', '#updateCart', function () {

        $(".request-loader").show();
        let cartqty = [];
        let cartprice = [];
        let cartproduct = [];
        let cartUpdateUrl = $(this).attr('data-href');
        $(".crt-qty input[name='quantity']").each(function () {
            cartqty.push($(this).val());
        })

        let formData = new FormData();
        let i = 0;
        for (i = 0; i < cartqty.length; i++) {
            formData.append('qty[]', cartqty[i]);
        }
        $.ajaxSetup({
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            }
        });
        $.ajax({
            type: "POST",
            url: cartUpdateUrl,
            data: formData,
            processData: false,
            contentType: false,
            success: function (data) {
                setTimeout(() => {
                    $(".request-loader").hide();
                }, 500);
                if (data.message) {
                    $("#refreshDiv").load(location.href + " #refreshDiv");
                    $("#cartQuantity").load(location.href + " #cartQuantity");
                    $("#cartIconWrapper").load(location.href + " #cartIconWrapper");
                    toastr["success"](data.message);
                } else {
                    toastr["error"](data.error);
                }
            }
        });
    });
    //================= cart update js end ==========================//

    $(".add-to-wish").on('click', function (e) {
        e.preventDefault();
        let item_id = $(this).data('item_id');
        // clear all previously loaded variations  input radio & checkboxes 
        $(".variation-label").addClass("d-none");
        $("#variants").html("");
        // load variants  in modal if variations  available for this item
        $(".request-loader").show();
        let $this = $(this);
        let url = $this.attr('data-href');
        addTowishList(url, $this);
    });


    // ============== modal quantity add / substruct =======================//
    $(document).on("click", ".modal-quantity .plus", function () {
        $voptions = $("input.voptions:checked");
        let $input = $(".modal-quantity input");
        let currval = parseInt($input.val());
        let newval = currval + 1;
        $input.val(newval);
        totalPrice(newval);

    });
    $(document).on("click", ".modal-quantity .minus", function () {
        let $input = $(".modal-quantity input");
        let currval = parseInt($input.val());
        if (currval > 1) {
            let newval = currval - 1;
            $input.val(newval);
            totalPrice(newval);
        }
    });
    // ============== modal quantity add / substruct =======================// 
    // ============== variant change js start =======================//
    $(document).on('change', '#variants input', function () {
        totalPrice($("input[name='cart-amount']").val());
    });
    // ============== variant change js end =======================//

    $(document).on('input', "input[name='cart-amount']", function () {
        totalPrice($("input[name='cart-amount']").val());
    });
    //============== addon change js end =======================//

    // ================ cart item remove js start =======================//


    $(document).ready(function () {
        $(".request-loader").hide();
    });

    $(document).on('click', '.item-remove', function () {
        $(".request-loader").show();
        let removeItemUrl = $(this).attr('data-href');
        $.get(removeItemUrl, function (res) {
            if (res.message == 'Item removed from wishlist successfully') {
                location.reload();
            } else {
                setTimeout(() => {
                    $(".request-loader").hide();
                }, 500);
                if (res.message) {
                    $("#refreshDiv").load(location.href + " #refreshDiv");
                    $("#cartQuantity").load(location.href + " #cartQuantity");
                    $("#cartIconWrapper").load(location.href + " #cartIconWrapper");
                    toastr["success"](res.message);
                } else {
                    toastr["error"](res.error);
                }
            }
        });
    });
    // ================ cart item remove js end =======================//

    // $('.addclick').on('click', function () {
    //     let orderamount = $('#detailsQuantity').val();
    //     $('#order_click_with_qty').val(orderamount);
    // });
    // $('.subclick').on('click', function () {
    //     let orderamount = $('#detailsQuantity').val();
    //     $('#order_click_with_qty').val(orderamount);
    // });
}(jQuery));
