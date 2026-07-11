<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>{{ $title }}</title>
</head>

<body>
  <button class="btn btn-primary" id="pay-button" style="display: none">Pay Now</button>

  <script src="{{ asset('assets/frontend/js/jquery.min.js') }}"></script>
  @if ($is_production == 0)
    <script src="https://app.midtrans.com/snap/snap.js" data-client-key="{{ $client_key }}"></script>
  @else
    <script src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key="{{ $client_key }}"></script>
  @endif

  <script>
    var success_url = "{{ $success_url }}";
    var _cancel_url = "{{ $_cancel_url }}";
    $(document).ready(function() {
      $('#pay-button').trigger('click');
    })

    const payButton = document.querySelector('#pay-button');
    payButton.addEventListener('click', function(e) {
      e.preventDefault();

      snap.pay('{{ $snapToken }}', {
        // Optional
        onSuccess: function(result) {
          console.log(result);
          /* You may add your own js here, this is just example */
          // document.getElementById('result-json').innerHTML += JSON.stringify(result, null, 2);
          let orderId = result.order_id;
          let status_code = result.status_code;
          window.location.href = success_url + "/?order_id=" + orderId + '&status_code=' + status_code;
        },
        // Optional
        onPending: function(result) {
          /* You may add your own js here, this is just example */
          // document.getElementById('result-json').innerHTML += JSON.stringify(result, null, 2);
          window.location.href = _cancel_url;
        },
        // Optional
        onError: function(result) {
          /* You may add your own js here, this is just example */
          // document.getElementById('result-json').innerHTML += JSON.stringify(result, null, 2);
          window.location.href = _cancel_url;
        }
      });
    });
  </script>
</body>

</html>
