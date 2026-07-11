<?php

namespace App\Http\Requests\User\CourseManagement;

use App\Models\User\CourseManagement\CourseInformation;
use App\Models\User\Language;
use App\Rules\ImageMimeTypeRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class CourseStoreRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules()
    {
        $ruleArray = [
            'thumbnail_image' => [
                'required',
                new ImageMimeTypeRule()
            ],
            'video_link' => 'required|url',
            'cover_image' => [
                'required',
                new ImageMimeTypeRule()
            ],
            'pricing_type' => 'required',
            'current_price' => 'required_if:pricing_type,premium'
        ];

        $languages = Language::where('user_id', Auth::guard('web')->user()->id)->get();

        $request = $this->request->all();
        foreach ($languages as $language) {
            $slug = slug_create($request[$language->code . '_title']);
            $ruleArray[$language->code . '_title'] = [
                'required',
                'max:255',
                function ($attribute, $value, $fail) use ($slug, $language) {
                    $cis = CourseInformation::where('language_id', $language->id)->where('user_id', Auth::guard('web')->user()->id)->get();
                    foreach ($cis as $key => $ci) {
                        if (strtolower($slug) == strtolower($ci->slug)) {
                            $fail(__('The title field must be unique for') . ' ' . $language->name . ' ' . __('language') . '.');
                        }
                    }
                }
            ];
            $ruleArray[$language->code . '_category_id'] = 'required';
            $ruleArray[$language->code . '_instructor_id'] = 'required';
            $ruleArray[$language->code . '_features'] = 'required';
            $ruleArray[$language->code . '_description'] = 'min:30';
        }

        return $ruleArray;
    }

    public function messages(): array
    {
        $messageArray = [];
        $languages = Language::where('user_id', Auth::guard('web')->user()->id)->get();
        $messageArray['current_price.required_if'] = __('The current price is required when pricing type is "Premium"') . '.';

        foreach ($languages as $language) {
            $messageArray[$language->code . '_title.required'] = __('The Title field is required for') . ' ' . $language->name . ' ' .__('language') . '.';
            $messageArray[$language->code . '_title.max'] = __('The Title field cannot contain more than 255 characters for') .  ' ' . $language->name . ' ' . __('language') . '.';
            $messageArray[$language->code . '_category_id.required'] = __('The Category field is required for') . ' ' . $language->name . ' ' . __('language') . '.';
            $messageArray[$language->code . '_instructor_id.required'] = __('The instructor field is required for') . ' ' . $language->name . ' ' . __('language') . '.';
            $messageArray[$language->code . '_features.required'] = __('The features field is required for') . ' ' . $language->name . ' ' . __('language') . '.';
            $messageArray[$language->code . '_description.min'] = __('The description must be at least 30 characters for') . ' ' . $language->name . ' ' . __('language') . '.';
        }
        return $messageArray;
    }
}
