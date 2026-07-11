<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Model;

class QuoteInput extends Model
{
    protected $table ='user_quote_inputs';

    protected $fillable = [
        'language_id',
        'user_id',
        'type',
        'label',
        'name',
        'placeholder',
        'required',
        'active',
        'order_number'
    ];

    public function quote_input_options()
    {
        return $this->hasMany(QuoteInputOption::class);
    }

    public function language()
    {
        return $this->belongsTo(Language::class);
    }
}
