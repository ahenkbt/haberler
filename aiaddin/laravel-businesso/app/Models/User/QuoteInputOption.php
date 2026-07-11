<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Model;

class QuoteInputOption extends Model
{
    protected $table ='user_quote_input_options';

    protected $fillable = [
        'type',
        'label',
        'name',
        'placeholder',
        'required'
    ];

    public function quote_input()
    {
        return $this->belongsTo(QuoteInput::class);
    }
}
