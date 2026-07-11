<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\User\FAQ;
use App\Models\User\Language;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Validator;

class FAQController extends Controller
{
    public function index(Request $request)
    {
        // first, get the language info from db
        $language = Language::where('code', $request->language)->where('user_id', Auth::id())->firstOrFail();

        // then, get the faqs of that language from db
        $information['faqs'] = FAQ::where('language_id', $language->id)
            ->where('user_id', Auth::id())
            ->orderBy('id', 'desc')
            ->get();

        // also, get all the languages from db
        $information['langs'] = Language::all();

        return view('user.faq.index', $information);
    }



    public function update(Request $request)
    {
        $rules = [
            'question' => 'required',
            'answer' => 'required',
            'serial_number' => 'required'
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        FAQ::where('user_id', Auth::user()->id)->where('id', $request->faq_id)->firstOrFail()->update($request->all());

        $request->session()->flash('success', __('FAQ updated successfully') . '!');

        return 'success';
    }

    public function delete(Request $request)
    {
        FAQ::where('user_id', Auth::user()->id)->where('id', $request->faq_id)->firstOrFail()->delete();

        $request->session()->flash('success', __('FAQ deleted successfully') . '!');

        return redirect()->back();
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->ids;

        foreach ($ids as $id) {
            FAQ::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail()->delete();
        }

        $request->session()->flash('success', __('FAQs deleted successfully') . '!');

        /**
         * this 'success' is returning for ajax call.
         * if return == 'success' then ajax will reload the page.
         */
        return 'success';
    }
}
