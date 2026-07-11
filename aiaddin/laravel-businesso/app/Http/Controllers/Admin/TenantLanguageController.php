<?php

namespace App\Http\Controllers\Admin;

use App\Models\Language;
use App\Traits\Keywords;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Validator;

class TenantLanguageController extends Controller
{



    public function editUserKeyword($id)
    {
        if ($id > 0) {
            $la = Language::findOrFail($id);
            $filePath = resource_path('lang/user_' . $la->code . '.json');
            if (!file_exists($filePath)) {
                $this->userLanguageKeywords(trim($la->code));
            }
            $json = file_get_contents($filePath);

            $json = json_decode($json, true);
            if (empty($json)) {
                return back()->with('warning', __('File Not Found.'));
            }
            return view('admin.language.edit-user-keyword', compact('json', 'la'));
        } elseif ($id == 0) {
            $json = file_get_contents(resource_path('lang/') . 'user_default.json');
            $json = json_decode($json, true);
            if (empty($json)) {
                return back()->with('warning', __('File Not Found.'));
            }
            return view('admin.language.edit-user-keyword', compact('json'));
        }
    }

    protected function userLanguageKeywords($code)
    {
        $user_data = file_get_contents(resource_path('lang/') . 'user_default.json');
        $admin_json_file = 'user_' . $code . '.json';
        $user_path = resource_path('lang/') . $admin_json_file;
        File::put($user_path, $user_data);
        //copy folder
        $userSourceFolder = resource_path('lang/' . $code);
        $userNewFolder = resource_path('lang/' . 'user_' . $code);
        $this->duplicateFolderAndRename($userSourceFolder, $userNewFolder);
        $userValidationSrc = resource_path('lang/user_' . $code . '/validation.php');
        $this->addNameAttributeForUser($userValidationSrc);
    }


    public function updateUserDashboardKeyword(Request $request, $id)
    {
        $language = Language::query()->find($id);
        $newkeywordsArr = $request['keys'];
        if (count($newkeywordsArr) === 0) {
            return back()->with('alert', __('At Least One Field Should Be Fill-up'));
        }

        $existingkeywordsArr = [];
        $fileLocated = resource_path('lang/') . 'user_' . $language->code . '.json';
        if (file_exists($fileLocated)) {
            $existingkeywordsArr = json_decode(file_get_contents($fileLocated), true) ?? [];
        }

        //override json file
        $requestKeywordsArr = array_merge($existingkeywordsArr, $newkeywordsArr);
        file_put_contents(resource_path('lang/') . 'user_' . $language->code . '.json', json_encode($requestKeywordsArr));

        //override validation attribute file

        $useruValidationFilePath = resource_path('lang/user_' . $language->code . '/validation.php');
        $this->updateNameAttributeForUser($useruValidationFilePath, $requestKeywordsArr);
        return back()->with('success', __('Updated successfully!'));
    }

    protected function updateNameAttributeForUser($validationFilePath, $requestKeywordsArr)
    {
        if (file_exists($validationFilePath)) {
            $validationData = include $validationFilePath;
            $validationAttributes = $validationData['attributes'];

            if (is_array($validationAttributes)) {
                foreach (Keywords::userNameAttribute() as $key => $value) {
                    if (!array_key_exists($key, $validationAttributes)) {
                        $validationAttributes[$key] = $value;
                    }
                }
            }

            foreach ($requestKeywordsArr as $key => $value) {
                if (array_key_exists($key, $validationAttributes)) {
                    $validationAttributes[$key] = $value;
                }
            }

            $validationData['attributes'] = $validationAttributes;
            $validationContent = "<?php\n\nreturn " . var_export($validationData, true) . ";\n";
            file_put_contents($validationFilePath, $validationContent);
        }
    }
    
    public function editCustomerKeyword($id)
    {
        $la = Language::findOrFail($id);

        $json = json_decode($la->customer_keywords, true);

        return view('admin.language.edit-customer-keyword', compact('json', 'la'));
    }
    public function updateCustomerKeyword($id, Request $request)
    {
        
        $lang = Language::findOrFail($id);
        $content = json_encode($request->keys);
        if ($content === 'null') {
            return back()->with('alert', __('At Least One Field Should Be Fill-up'));
        }

        $lang->customer_keywords = $content;
        $lang->save();

        Session::flash('success', __('Updated successfully!'));
        return 'success';
    }
}
