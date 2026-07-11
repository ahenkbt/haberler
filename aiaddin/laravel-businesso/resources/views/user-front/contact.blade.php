@extends('user-front.layout')

@section('tab-title')
  {{ $keywords['Contact'] ?? 'Contacts' }}
@endsection

@section('meta-description', !empty($userSeo) ? $userSeo->contact_meta_description : '')
@section('meta-keywords', !empty($userSeo) ? $userSeo->contact_meta_keywords : '')

@section('page-name')
  {{ $keywords['Contact_Us'] ?? 'Contact Us' }}
@endsection
@section('br-name')
  {{ $keywords['Contact_Us'] ?? 'Contact Us' }}
@endsection

@section('content')
  <!--====== Contact Section start ======-->
  <section class="contact-section contact-page section-gap pb-0">
    <div class="container">
      <div class="contact-info">
        <div class="row justify-content-center align-items-center">
          <div class="col-lg-6 order-2 order-lg-1">
            <div class="illustration-img text-center">
              @php
                $contactImg = $contact->contact_form_image ?? 'contact_img.png';
              @endphp
              <img class="lazy" data-src="{{ asset('assets/front/img/user/' . $contactImg) }}" alt="Image">
            </div>
          </div>
          <div class="col-lg-6 col-md-10 order-1 order-lg-2">
            <div class="contact-info-content">
              <div class="section-title left-border mb-40">
                @if (!empty($contact->contact_form_title))
                  <span class="title-tag">{{ $contact->contact_form_title ?? null }}</span>
                @endif
                <h2 class="title pb-0">{{ $contact->contact_form_subtitle ?? null }}</h2>
              </div>
              <ul>
                @php
                  $phone_numbers = !empty($contact->contact_numbers) ? explode(',', $contact->contact_numbers) : [];
                  $emails = !empty($contact->contact_mails) ? explode(',', $contact->contact_mails) : [];
                  $addresses = !empty($contact->contact_addresses) ? explode(PHP_EOL, $contact->contact_addresses) : [];
                @endphp
                @if (count($phone_numbers) > 0)
                  <li class="phone">
                    <i class="far fa-phone mr-0"></i>
                    @foreach ($phone_numbers as $phone_number)
                      <a href="tel:{{ $phone_number }}">{{ $phone_number }}</a>
                      @if (!$loop->last)
                        ,
                      @endif
                    @endforeach
                  </li>
                @endif
                @if (count($emails) > 0)
                  <li>
                    <i class="far fa-envelope-open mr-0"></i>
                    @foreach ($emails as $email)
                      <a href="mailto:{{ $email }}">{{ $email }}</a>
                      @if (!$loop->last)
                        ,
                      @endif
                    @endforeach
                  </li>
                @endif
                @if (count($addresses) > 0)
                  @foreach ($addresses as $address)
                    <li class="mb-0">
                      <i class="far fa-map-marker-alt mr-0"></i>
                      <span class="mb-0">{{ $address }}</span>
                    </li>
                  @endforeach
                @endif
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="contact-form grey-bg {{ empty($contact->latitude) || empty($contact->longitude) ? 'mb-0' : '' }}">
        <div class="row no-gutters justify-content-center">
          <div class="col-10">
            {{-- <div class="section-title text-center mb-40">
                            <h2 class="title">{{ $home_text->contact_subtitle ?? null }}</h2>
                        </div> --}}

            <form action="{{ route('front.contact.message', getParam()) }}" method="POST" enctype="multipart/form-data">
              @csrf
              <input type="hidden" name="id" value="{{ $user->id }}">
              <div class="row">
                <div class="col-lg-4">
                  <div class="input-group mb-30">
                    <input type="text" placeholder="{{ $keywords['Name'] ?? 'Name' }}" name="fullname"
                      value="{{ old('fullname') }}" required>
                    <span class="icon"><i class="far fa-user-circle"></i></span>
                    @error('fullname')
                      <p class="mb-0 ml-3 text-danger">{{ $message }}</p>
                    @enderror
                  </div>
                </div>
                <div class="col-lg-4">
                  <div class="input-group mb-30">
                    <input type="email" placeholder="{{ $keywords['Email_Address'] ?? 'Email Address' }}"
                      name="email" value="{{ old('email') }}" required>
                    <span class="icon"><i class="far fa-envelope-open"></i></span>
                    @error('email')
                      <p class="mb-0 ml-3 text-danger">{{ $message }}</p>
                    @enderror
                  </div>
                </div>
                <div class="col-lg-4">
                  <div class="input-group mb-30">
                    <input type="text" placeholder="{{ $keywords['Subject'] ?? 'Subject' }}" name="subject"
                      value="{{ old('subject') }}" required>
                    <span class="icon"><i class="far fa-envelope"></i></span>
                    @error('subject')
                      <p class="mb-0 ml-3 text-danger">{{ $message }}</p>
                    @enderror
                  </div>
                </div>
                <div class="col-12">
                  <div class="input-group textarea mb-30">
                    <textarea placeholder="{{ $keywords['Message'] ?? 'Message' }}" name="message" required>{{ old('message') }}</textarea>
                    <span class="icon"><i class="far fa-pencil"></i></span>
                    @error('message')
                      <p class="mb-0 ml-3 text-danger">{{ $message }}</p>
                    @enderror
                  </div>
                </div>
                <div class="col form_group">
                  @if ($userBs->is_recaptcha == 1)
                    <div class="d-block mb-4">
                      {!! NoCaptcha::renderJs() !!}
                      {!! NoCaptcha::display() !!}
                      @if ($errors->has('g-recaptcha-response'))
                        @php
                          $errmsg = $errors->first('g-recaptcha-response');
                        @endphp
                        <p class="text-danger mb-0 mt-2">{{ __("$errmsg") }}</p>
                      @endif
                    </div>
                  @endif
                </div>
                <div class="col-12 text-center">
                  <button type="submit"
                    class="main-btn template-btn @if ($userBs->theme == 'home_eleven') btn @endif">{{ $keywords['Send_Message'] ?? 'Send Message' }}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    @if (!empty($contact->latitude) && !empty($contact->longitude))
      <div class="container-fluid container-1600 mb-0">
        <div class="contact-map">
          <iframe
            src="//www.google.com/maps?width=100%25&amp;height=600&amp;hl=en&amp;q={{ $contact->latitude ?? 36.7783 }},%20{{ $contact->longitude ?? 119.4179 }}+(My%20Business%20Name)&amp;t=&amp;z={{ $contact->map_zoom ?? 12 }}&amp;ie=UTF8&amp;iwloc=B&amp;output=embed"
            class="border-0" allowfullscreen="" aria-hidden="false" tabindex="0"></iframe>
        </div>
      </div>
    @endif
  </section>
@endsection
