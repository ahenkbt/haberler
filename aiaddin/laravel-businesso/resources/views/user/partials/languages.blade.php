 @php
   $userDefaultLang = \App\Models\User\Language::where([
       ['user_id', \Illuminate\Support\Facades\Auth::id()],
       ['is_default', 1],
   ])->first();
   $userLanguages = \App\Models\User\Language::where('user_id', \Illuminate\Support\Facades\Auth::id())->get();
 @endphp
 @if (!is_null($userDefaultLang))
   @if (!empty($userLanguages))
     <select name="userLanguage" class="form-control"
       onchange="window.location='{{ url()->current() . '?language=' }}'+this.value">
       <option value="" selected disabled>{{ __('Select a Language') }}</option>
       @foreach ($userLanguages as $lang)
         <option value="{{ $lang->code }}" {{ $lang->code == request()->input('language') ? 'selected' : '' }}>
           {{ $lang->name }}</option>
       @endforeach
     </select>
   @endif
 @endif
