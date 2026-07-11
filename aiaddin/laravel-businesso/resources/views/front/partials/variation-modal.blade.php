<div class="modal fade" id="variationModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
  aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h4 class="modal-title " id="exampleModalLongTitle">
          <span></span>
          <small class="ml-2">
            ({{ $userBs->base_currency_text_position == 'left' ? $userBs->base_currency_text : '' }}
            <span id="productPrice"></span>
            {{ $userBs->base_currency_text_position == 'right' ? $userBs->base_currency_text : '' }})
          </small>
        </h4>
        <button type="button" class="close" data-dismiss="modal" data-bs-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
        <div class="row" id="variants">
          {{-- All variants will be appended here by jquery --}}
        </div>
      </div>
      <div class="modal-footer">
        <div class="row justify-content-center align-items-center">
          <div class="col-lg-5">
            <div class="modal-quantity">
              <span class="minus"><i class="fas fa-minus"></i></span>
              <input class="form-control" type="number" name="cart-amount" readonly value="1" min="1">
              <span class="plus"><i class="fas fa-plus"></i></span>
            </div>
          </div>
          <div class="col-lg-5">
            <button type="button" class="main-btn btn-block modal-cart-link">
              <span class="d-block">{{ $keywords['Add_to_cart'] ?? 'Add to cart' }}</span>
              <i class="fas fa-spinner d-none"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
