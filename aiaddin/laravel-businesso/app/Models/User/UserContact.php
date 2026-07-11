<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Model;

class UserContact extends Model
{
    public $table = "user_contacts";

    protected $fillable = [
        'contact_form_image',
        'contact_form_title',
        'contact_form_subtitle',
        'contact_addresses',
        'contact_numbers',
        'contact_mails',
        'latitude',
        'longitude',
        'map_zoom',
        'user_id',
        'language_id',
    ];

    public function language()
    {
        return $this->belongsTo(Language::class, 'language_id');
    }
}
